import type { SupabaseClient } from '@supabase/supabase-js'
import type { SyncFields, TripDB } from '../data/db'
import { RECEIPTS_BUCKET } from '../lib/supabase'

// Offline-first sync between this phone's Dexie DB and Supabase.
//
// push: rows with _dirty = 1, parents first (trips, members, then the rest) for the foreign keys.
//       New rows (_new = 1) are inserted; known rows are updated by id (an upsert would run the INSERT
//       policy too, which fails for an admin editing a trip someone else created).
//       A row is marked clean only if it wasn't edited again while the request was in flight.
// pull: the trips list in full (it is small, and a trip you just joined can be older than any cursor),
//       then each trip's child tables since that trip's last pull, keyset-paged on (updated_at, id).
//       Rows with unpushed local edits are skipped: the local edit wins and goes up next push.
// receipts: upload / delete queued photos.
// Deletions travel as deleted_at; trips you lost access to are removed from the phone.

// Order matters for push: members and categories before the rows that point at them.
const CHILD_TABLES = ['trip_members', 'trip_categories', 'expenses', 'contributions', 'settlements'] as const
type ChildTable = (typeof CHILD_TABLES)[number]
type SyncTable = 'trips' | ChildTable

const PUSH_BATCH = 200
const PULL_PAGE = 1000

/**
 * Never sent on update: set once, or changed only through join_trip. A member's role is sent only by
 * the trip owner (the only one allowed to change it), so an admin's stale copy can't block the sync.
 */
const UPDATE_SKIP: Record<SyncTable, string[]> = {
  trips: ['created_by', 'created_at', 'updated_at'],
  trip_members: ['user_id', 'trip_id', 'created_at', 'updated_at'],
  trip_categories: ['created_by', 'created_at', 'updated_at'],
  expenses: ['created_by', 'created_at', 'updated_at'],
  contributions: ['created_by', 'created_at', 'updated_at'],
  settlements: ['created_by', 'created_at', 'updated_at'],
}

type Row = SyncFields & { id: string; trip_id?: string } & Record<string, unknown>
type Cursor = { ts: string; id: string }

const cursorKey = (userId: string, table: ChildTable, tripId: string) => `trip-hisab:${userId}:pulled:${table}:${tripId}`

function readCursor(key: string): Cursor | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Cursor) : null
  } catch {
    return null
  }
}

export async function countPending(db: TripDB): Promise<number> {
  let total = await db.receipts.where('pending').equals(1).count()
  for (const table of ['trips', ...CHILD_TABLES] as const) total += await db.table(table).where('_dirty').equals(1).count()
  return total
}

export async function syncNow(db: TripDB, client: SupabaseClient, userId: string) {
  // Also refreshes an expired access token.
  const { data } = await client.auth.getSession()
  if (!data.session) throw new Error('Login khatam ho gaya: logout karke dobara Google se login karein.')
  if (data.session.user.id !== userId) throw new Error('Kisi aur account se login hai.')

  for (const table of ['trips', ...CHILD_TABLES] as const) await push(db, client, table, userId)
  await syncReceipts(db, client)
  await pull(db, client, userId)
}

function payloadOf(row: Row, skip: string[] = []) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) if (!k.startsWith('_') && !skip.includes(k)) out[k] = v
  return out
}

/** True when the Supabase project doesn't have this table yet (a migration not run). */
const isMissingTable = (error: { code?: string } | null) => error?.code === 'PGRST205' || error?.code === '42P01'

async function push(db: TripDB, client: SupabaseClient, table: SyncTable, userId: string) {
  const local = db.table<Row, string>(table)
  const dirty = await local.where('_dirty').equals(1).toArray()
  if (dirty.length === 0) return

  const done: Row[] = []
  const toUpdate = dirty.filter((r) => r._new !== 1)
  const fresh = dirty.filter((r) => r._new === 1)

  for (let i = 0; i < fresh.length; i += PUSH_BATCH) {
    const batch = fresh.slice(i, i + PUSH_BATCH)
    // ignoreDuplicates: a retry after a lost response must not fail; rows that already exist are updated below.
    const { data, error } = await client
      .from(table)
      .upsert(batch.map((r) => payloadOf(r)), { onConflict: 'id', ignoreDuplicates: true })
      .select('id')
    if (error && table === 'trip_categories' && isMissingTable(error)) {
      throw new Error('Nayi kharcha types ke liye Supabase mein 002_custom_categories.sql chalani hai.')
    }
    if (error) throw new Error(`Upload ${table} failed: ${error.message}`)
    const inserted = new Set((data as { id: string }[]).map((r) => r.id))
    for (const row of batch) (inserted.has(row.id) ? done : toUpdate).push(row)
  }

  const owned = new Set((await db.trips.toArray()).filter((t) => t.created_by === userId).map((t) => t.id))
  for (const row of toUpdate) {
    const skip = [...UPDATE_SKIP[table]]
    if (table === 'trip_members' && !owned.has(row.trip_id ?? '')) skip.push('role')
    const { error } = await client.from(table).update(payloadOf(row, skip)).eq('id', row.id)
    if (error) throw new Error(`Upload ${table} failed: ${error.message}`)
    done.push(row)
  }

  await db.transaction('rw', local, async () => {
    for (const sent of done) {
      const current = await local.get(sent.id)
      if (!current || current.updated_at !== sent.updated_at) continue // edited meanwhile: next round
      await local.update(sent.id, { _dirty: 0, _new: 0 })
    }
  })
}

async function syncReceipts(db: TripDB, client: SupabaseClient) {
  const queue = await db.receipts.where('pending').equals(1).toArray()
  for (const item of queue) {
    const bucket = client.storage.from(RECEIPTS_BUCKET)
    if (item.blob) {
      const { error } = await bucket.upload(item.path, item.blob, { upsert: true, contentType: 'image/jpeg' })
      if (error) throw new Error(`Receipt upload failed: ${error.message}`)
    } else {
      const { error } = await bucket.remove([item.path])
      if (error) throw new Error(`Receipt delete failed: ${error.message}`)
    }
    await db.transaction('rw', db.receipts, async () => {
      const current = await db.receipts.get(item.path)
      if (!current || current.blob !== item.blob) return // replaced meanwhile: next round
      if (item.blob) await db.receipts.update(item.path, { pending: 0 })
      else await db.receipts.delete(item.path)
    })
  }
}

async function pull(db: TripDB, client: SupabaseClient, userId: string) {
  const { data, error } = await client.from('trips').select('*')
  if (error) throw new Error(`Download trips failed: ${error.message}`)
  const trips = data as Row[]
  const visible = new Set(trips.map((t) => t.id))

  await db.transaction('rw', db.trips, async () => {
    const existing = await db.trips.bulkGet(trips.map((t) => t.id))
    await db.trips.bulkPut(trips.filter((_, i) => existing[i]?._dirty !== 1).map(toLocalRow) as never[])
  })

  // Trips no longer visible (removed from the trip, or deleted) leave this phone.
  const gone = (await db.trips.toArray()).filter((t) => !visible.has(t.id) && t._new !== 1)
  for (const trip of gone) await forgetTrip(db, userId, trip.id)

  for (const trip of trips) {
    for (const table of CHILD_TABLES) await pullChild(db, client, userId, table, trip.id)
  }
}

async function pullChild(db: TripDB, client: SupabaseClient, userId: string, table: ChildTable, tripId: string) {
  const local = db.table<Row, string>(table)
  const key = cursorKey(userId, table, tripId)
  let cursor = readCursor(key)

  for (;;) {
    let query = client
      .from(table)
      .select('*')
      .eq('trip_id', tripId)
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(PULL_PAGE)
    if (cursor) {
      // Quoted because timestamps contain PostgREST's reserved characters (: .)
      query = query.or(`updated_at.gt."${cursor.ts}",and(updated_at.eq."${cursor.ts}",id.gt.${cursor.id})`)
    }
    const { data, error } = await query
    if (error && table === 'trip_categories' && isMissingTable(error)) return // 002 not run yet: nothing to pull
    if (error) throw new Error(`Download ${table} failed: ${error.message}`)
    const rows = data as Row[]
    if (rows.length === 0) break

    await db.transaction('rw', local, async () => {
      const existing = await local.bulkGet(rows.map((r) => r.id))
      await local.bulkPut(rows.filter((_, i) => existing[i]?._dirty !== 1).map(toLocalRow))
    })

    const last = rows[rows.length - 1]
    cursor = { ts: last.updated_at, id: last.id }
    localStorage.setItem(key, JSON.stringify(cursor))
    if (rows.length < PULL_PAGE) break
  }
}

async function forgetTrip(db: TripDB, userId: string, tripId: string) {
  await db.transaction('rw', [db.trips, ...CHILD_TABLES.map((t) => db.table(t))], async () => {
    for (const table of CHILD_TABLES) await db.table(table).where('trip_id').equals(tripId).delete()
    await db.trips.delete(tripId)
  })
  for (const table of CHILD_TABLES) localStorage.removeItem(cursorKey(userId, table, tripId))
}

function toLocalRow(row: Row): Row {
  const copy: Row = { ...row, _dirty: 0, _new: 0 }
  if ('amount' in copy) copy.amount = Number(copy.amount)
  return copy
}
