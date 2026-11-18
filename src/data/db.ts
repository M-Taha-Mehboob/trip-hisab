import Dexie, { type EntityTable } from 'dexie'
import type { Contribution, Expense, Settlement, Trip, TripCategory, TripMember } from './types'

// Offline copy of the trips this user can see (IndexedDB via Dexie). Pages read it through
// DataProvider; all writes go through ./store.ts; ../sync/sync.ts pushes and pulls it.

/** Columns every synced table has on top of its row type (see supabase/migrations/001_init.sql). */
export interface SyncFields {
  updated_at: string
  deleted_at: string | null
  /** 1 = changed on this phone and not uploaded yet. */
  _dirty: 0 | 1
  /** 1 = created on this phone and never uploaded (pushed with insert instead of update). */
  _new: 0 | 1
}

export type LocalTrip = Trip & SyncFields & { created_by: string }
export type LocalMember = TripMember & SyncFields
export type LocalCategory = TripCategory & SyncFields
export type LocalExpense = Expense & SyncFields
export type LocalContribution = Contribution & SyncFields
export type LocalSettlement = Settlement & SyncFields

/**
 * Receipt photos kept on the phone. `pending` = 1: upload `blob` to `path`, or delete the photo at
 * `path` when `blob` is null. Uploaded photos stay here (pending 0) as an offline cache.
 */
export interface LocalReceipt {
  path: string
  blob: Blob | null
  pending: 0 | 1
}

export type TripDB = Dexie & {
  trips: EntityTable<LocalTrip, 'id'>
  trip_members: EntityTable<LocalMember, 'id'>
  trip_categories: EntityTable<LocalCategory, 'id'>
  expenses: EntityTable<LocalExpense, 'id'>
  contributions: EntityTable<LocalContribution, 'id'>
  settlements: EntityTable<LocalSettlement, 'id'>
  receipts: EntityTable<LocalReceipt, 'path'>
}

/** One IndexedDB database per Google login, so two people sharing a phone never mix data. */
export function openTripDB(userId: string): TripDB {
  const db = new Dexie(`trip-hisab-${userId}`) as TripDB
  db.version(1).stores({
    trips: 'id, _dirty',
    trip_members: 'id, trip_id, _dirty',
    expenses: 'id, trip_id, _dirty',
    contributions: 'id, trip_id, _dirty',
    settlements: 'id, trip_id, _dirty',
    receipts: 'path, pending',
  })
  // 002_custom_categories.sql
  db.version(2).stores({ trip_categories: 'id, trip_id, _dirty' })
  return db
}

export const isAlive = (row: { deleted_at: string | null }) => row.deleted_at === null
