// Phase 1 data store: mock trips in memory, saved to localStorage so test entries survive a reload.
// Phase 3 swaps this for Dexie (offline cache) + an outbox synced to Supabase; pages only use the
// hooks in ./hooks.ts and the actions below, so they won't change much.

import { useSyncExternalStore } from 'react'
import { MOCK_USER_ID, mockTrips } from './mock'
import type { Contribution, Expense, TripData, TripMember } from './types'

interface State {
  trips: TripData[]
  /** Mock only: see the app as a read-only member even where you are admin. */
  viewAsMember: boolean
}

const KEY = 'trip-hisab:mock:v1'

function load(): State {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) return JSON.parse(saved) as State
  } catch {
    // ignore: fall back to the sample data
  }
  return { trips: structuredClone(mockTrips), viewAsMember: false }
}

let state: State = load()
const listeners = new Set<() => void>()

function setState(next: State) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // storage full / private mode: keep working in memory
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state))
}

export const currentUserId = MOCK_USER_ID

function updateTrip(tripId: string, fn: (d: TripData) => TripData) {
  setState({ ...state, trips: state.trips.map((d) => (d.trip.id === tripId ? fn(d) : d)) })
}

const now = () => new Date().toISOString()

// ---- Actions (admin only; the UI hides them for members, RLS enforces it on the server) ----

export function saveExpense(tripId: string, input: Omit<Expense, 'id' | 'trip_id' | 'created_at'>, id?: string) {
  updateTrip(tripId, (d) => ({
    ...d,
    expenses: id
      ? d.expenses.map((e) => (e.id === id ? { ...e, ...input } : e))
      : [...d.expenses, { ...input, id: crypto.randomUUID(), trip_id: tripId, created_at: now() }],
  }))
}

export function deleteExpense(tripId: string, id: string) {
  updateTrip(tripId, (d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== id) }))
}

export function addContribution(tripId: string, input: Omit<Contribution, 'id' | 'trip_id' | 'created_at'>) {
  updateTrip(tripId, (d) => ({
    ...d,
    contributions: [...d.contributions, { ...input, id: crypto.randomUUID(), trip_id: tripId, created_at: now() }],
  }))
}

export function deleteContribution(tripId: string, id: string) {
  updateTrip(tripId, (d) => ({ ...d, contributions: d.contributions.filter((c) => c.id !== id) }))
}

export function setFundHolder(tripId: string, memberId: string) {
  updateTrip(tripId, (d) => ({ ...d, trip: { ...d.trip, fund_holder_member_id: memberId } }))
}

/** Mark a settle-up transfer Paid (stores it) or not paid (removes it). */
export function toggleSettlement(tripId: string, fromId: string, toId: string, amount: number, settlementId?: string) {
  updateTrip(tripId, (d) => ({
    ...d,
    settlements: settlementId
      ? d.settlements.filter((s) => s.id !== settlementId)
      : [
          ...d.settlements,
          { id: crypto.randomUUID(), trip_id: tripId, from_member_id: fromId, to_member_id: toId, amount, paid_at: now() },
        ],
  }))
}

export function setTripStatus(tripId: string, status: 'active' | 'settled', endDate: string | null) {
  updateTrip(tripId, (d) => ({ ...d, trip: { ...d.trip, status, end_date: endDate ?? d.trip.end_date } }))
}

export function createTrip(input: { name: string; startDate: string; myName: string; memberNames: string[] }): string {
  const tripId = crypto.randomUUID()
  const names = [input.myName, ...input.memberNames]
  const members: TripMember[] = names.map((name, i) => ({
    id: crypto.randomUUID(),
    trip_id: tripId,
    user_id: i === 0 ? currentUserId : null,
    display_name: name,
    role: i === 0 ? 'admin' : 'member',
    sort_order: i,
    avatar_url: null,
  }))
  const trip: TripData = {
    trip: {
      id: tripId,
      name: input.name,
      start_date: input.startDate,
      end_date: null,
      status: 'active',
      invite_code: Math.random().toString(36).slice(2, 8),
      fund_holder_member_id: members[0].id,
      created_at: now(),
    },
    members,
    expenses: [],
    contributions: [],
    settlements: [],
  }
  setState({ ...state, trips: [trip, ...state.trips] })
  return tripId
}

export function setViewAsMember(viewAsMember: boolean) {
  setState({ ...state, viewAsMember })
}

export function resetMockData() {
  setState({ trips: structuredClone(mockTrips), viewAsMember: false })
}
