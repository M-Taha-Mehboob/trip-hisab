// All writes go to this phone's Dexie DB first (works offline) and are marked _dirty; the sync engine
// (../sync/sync.ts) uploads them. Pages read through ./hooks.ts.
// Admin-only actions: the UI hides them for members, RLS enforces it on the server.

import { useSyncExternalStore } from 'react'
import type { LocalExpense, SyncFields, TripDB } from './db'
import type { Contribution, Expense, TripMember } from './types'

let bound: { db: TripDB; userId: string } | null = null

/** Called by <RequireAuth> with the signed-in user's database. */
export function bindStore(db: TripDB, userId: string) {
  bound = { db, userId }
}

function ctx() {
  if (!bound) throw new Error('Not signed in')
  return bound
}

const nowISO = () => new Date().toISOString()

function fresh(): SyncFields {
  return { updated_at: nowISO(), deleted_at: null, _dirty: 1, _new: 1 }
}

type ChildTable = 'trip_members' | 'trip_categories' | 'expenses' | 'contributions' | 'settlements'
type Table = 'trips' | ChildTable

// Untyped on purpose (Dexie's generics don't compose here); the exported actions are typed.
async function touch(table: Table, id: string, changes: Record<string, unknown>) {
  await ctx().db.table(table).update(id, { ...changes, updated_at: nowISO(), _dirty: 1 })
}

const softDelete = (table: ChildTable, id: string) => touch(table, id, { deleted_at: nowISO() })

/** Shows write errors instead of leaving an unhandled promise (a failed IndexedDB write is rare). */
function report(p: Promise<unknown>) {
  p.catch((err: unknown) => {
    console.error(err)
    window.alert(`Save nahi hua: ${err instanceof Error ? err.message : String(err)}`)
  })
}

// ---- Receipt photos ----

export const receiptPath = (tripId: string, expenseId: string) => `${tripId}/${expenseId}.jpg`

async function queueReceipt(path: string, blob: Blob | null) {
  await ctx().db.receipts.put({ path, blob, pending: 1 })
}

// ---- Expenses ----

export type ExpenseInput = Omit<Expense, 'id' | 'trip_id' | 'created_at' | 'receipt_path'>

/**
 * New or edited expense. `photo`: a compressed JPEG to attach, null to remove the photo,
 * undefined to leave it as it is.
 */
export async function saveExpense(tripId: string, input: ExpenseInput, id?: string, photo?: Blob | null) {
  const { db } = ctx()
  const expenseId = id ?? crypto.randomUUID()
  const path = receiptPath(tripId, expenseId)
  await db.transaction('rw', db.expenses, db.receipts, async () => {
    const old = id ? await db.expenses.get(id) : undefined
    let receipt_path = old?.receipt_path ?? null
    if (photo) {
      await queueReceipt(path, photo)
      receipt_path = path
    } else if (photo === null && receipt_path) {
      await queueReceipt(receipt_path, null)
      receipt_path = null
    }
    if (old) {
      await touch('expenses', expenseId, { ...input, receipt_path })
    } else {
      const row: LocalExpense = { ...fresh(), ...input, id: expenseId, trip_id: tripId, receipt_path, created_at: nowISO() }
      await db.expenses.add(row)
    }
  })
}

export function deleteExpense(_tripId: string, id: string) {
  report(
    (async () => {
      const { db } = ctx()
      await db.transaction('rw', db.expenses, db.receipts, async () => {
        const old = await db.expenses.get(id)
        if (old?.receipt_path) await queueReceipt(old.receipt_path, null)
        await softDelete('expenses', id)
      })
    })(),
  )
}

// ---- Group Fund ----

export function addContribution(tripId: string, input: Omit<Contribution, 'id' | 'trip_id' | 'created_at'>) {
  report(ctx().db.contributions.add({ ...fresh(), ...input, id: crypto.randomUUID(), trip_id: tripId, created_at: nowISO() }))
}

export function deleteContribution(_tripId: string, id: string) {
  report(softDelete('contributions', id))
}

export function setFundHolder(tripId: string, memberId: string) {
  report(touch('trips', tripId, { fund_holder_member_id: memberId }))
}

// ---- Settle up ----

/** Mark a settle-up transfer Paid (stores it) or not paid (soft-deletes it). */
export function toggleSettlement(tripId: string, fromId: string, toId: string, amount: number, settlementId?: string) {
  if (settlementId) return report(softDelete('settlements', settlementId))
  report(
    ctx().db.settlements.add({
      ...fresh(),
      id: crypto.randomUUID(),
      trip_id: tripId,
      from_member_id: fromId,
      to_member_id: toId,
      amount,
      paid_at: nowISO(),
    }),
  )
}

export function setTripStatus(tripId: string, status: 'active' | 'settled', endDate: string | null) {
  report(
    (async () => {
      const trip = await ctx().db.trips.get(tripId)
      await touch('trips', tripId, { status, end_date: endDate ?? trip?.end_date ?? null })
    })(),
  )
}

// ---- Expense types (the trip's own; built-in ones live in src/lib/categories.ts) ----

/** Adds a type to the trip and returns its id (pick it on the expense right away). */
export async function addCategory(tripId: string, name: string, icon: string): Promise<string> {
  const { db } = ctx()
  const existing = await db.trip_categories.where('trip_id').equals(tripId).toArray()
  const id = crypto.randomUUID()
  await db.trip_categories.add({
    ...fresh(),
    id,
    trip_id: tripId,
    name,
    icon,
    sort_order: Math.max(-1, ...existing.map((c) => c.sort_order)) + 1,
    created_at: nowISO(),
  })
  return id
}

// ---- Members (admin; making admins is owner-only, enforced by the server too) ----

/** A placeholder member: the person links it to their login later through the invite link. */
export async function addMember(tripId: string, name: string) {
  const { db } = ctx()
  const existing = await db.trip_members.where('trip_id').equals(tripId).toArray()
  await db.trip_members.add({
    ...fresh(),
    id: crypto.randomUUID(),
    trip_id: tripId,
    user_id: null,
    display_name: name,
    role: 'member',
    sort_order: Math.max(-1, ...existing.map((m) => m.sort_order)) + 1,
    avatar_url: null,
  })
}

export function renameMember(memberId: string, name: string) {
  report(touch('trip_members', memberId, { display_name: name }))
}

export function setMemberRole(memberId: string, role: 'admin' | 'member') {
  report(touch('trip_members', memberId, { role }))
}

/** Only for members with no money in the hisab (the page checks); also removes their access. */
export function removeMember(memberId: string) {
  report(softDelete('trip_members', memberId))
}

// ---- New trip ----

function inviteCode() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

/** Someone from an earlier trip who already logged in (userId set), offered when making a new trip. */
export interface PastPerson {
  userId: string
  name: string
  avatarUrl: string | null
}

/**
 * Creates the trip with you as owner + admin, `pastPeople` already linked to their logins (allowed by
 * migration 003, so the trip just shows up on their phones) and `memberNames` as placeholders.
 * Returns the trip id.
 */
export async function createTrip(input: {
  name: string
  startDate: string
  myName: string
  myAvatarUrl: string | null
  pastPeople?: PastPerson[]
  memberNames: string[]
}): Promise<string> {
  const { db, userId } = ctx()
  const tripId = crypto.randomUUID()
  const people = [
    { userId: userId as string | null, name: input.myName, avatarUrl: input.myAvatarUrl },
    ...(input.pastPeople ?? []),
    ...input.memberNames.map((name) => ({ userId: null, name, avatarUrl: null })),
  ]
  const members: (TripMember & SyncFields)[] = people.map((p, i) => ({
    ...fresh(),
    id: crypto.randomUUID(),
    trip_id: tripId,
    user_id: p.userId,
    display_name: p.name,
    role: i === 0 ? 'admin' : 'member',
    sort_order: i,
    avatar_url: p.avatarUrl,
  }))
  await db.transaction('rw', db.trips, db.trip_members, async () => {
    await db.trips.add({
      ...fresh(),
      id: tripId,
      name: input.name,
      start_date: input.startDate,
      end_date: null,
      status: 'active',
      invite_code: inviteCode(),
      fund_holder_member_id: members[0].id,
      created_by: userId,
      created_at: nowISO(),
    })
    await db.trip_members.bulkAdd(members)
  })
  return tripId
}

// ---- "Member ki nazar se dekhein" (this phone only) ----

const VIEW_KEY = 'trip-hisab:view-as-member'
const viewListeners = new Set<() => void>()

function readViewAsMember() {
  try {
    return localStorage.getItem(VIEW_KEY) === '1'
  } catch {
    return false
  }
}

export function setViewAsMember(on: boolean) {
  try {
    localStorage.setItem(VIEW_KEY, on ? '1' : '0')
  } catch {
    // private mode: ignore
  }
  viewListeners.forEach((l) => l())
}

export function useViewAsMemberPref() {
  return useSyncExternalStore(
    (l) => {
      viewListeners.add(l)
      return () => viewListeners.delete(l)
    },
    readViewAsMember,
  )
}
