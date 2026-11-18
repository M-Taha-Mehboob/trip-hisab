import { useMemo, useSyncExternalStore } from 'react'
import { categoryInfo, tripCategories, type CategoryInfo } from '../lib/categories'
import { remainingBalance, settlePlan, summarize, type MemberBalance, type Transfer, type TripSummary } from '../lib/hisab'
import type { LocalTrip } from './db'
import { useSession, useTripsData } from './session'
import { useViewAsMemberPref } from './store'
import type { Settlement, TripData, TripMember } from './types'

export interface TripView {
  data: TripData
  summary: TripSummary
  /** The signed-in user's member row (undefined if they are not in this trip). */
  me: TripMember | undefined
  myBalance: MemberBalance | undefined
  /** My balance after the transfers already marked Paid. */
  myRemaining: number
  isAdmin: boolean
  /** The signed-in user created this trip (only the owner makes or removes admins). */
  isOwner: boolean
  /** Built-in expense types followed by the trip's own. */
  categories: CategoryInfo[]
  category: (id: string) => CategoryInfo
  holder: TripMember | undefined
  member: (id: string | null) => TripMember | undefined
  plan: { paid: Settlement[]; open: Transfer[] }
}

export function buildTripView(data: TripData, userId: string, viewAsMember: boolean): TripView {
  const summary = summarize({
    members: data.members,
    expenses: data.expenses,
    contributions: data.contributions,
    fundHolderMemberId: data.trip.fund_holder_member_id,
  })
  const me = data.members.find((m) => m.user_id === userId)
  const myBalance = summary.balances.find((b) => b.memberId === me?.id)
  const byId = new Map(data.members.map((m) => [m.id, m]))
  const categories = tripCategories(data.categories)
  const isOwner = (data.trip as LocalTrip).created_by === userId
  return {
    data,
    summary,
    me,
    myBalance,
    myRemaining: myBalance ? remainingBalance(myBalance, data.settlements) : 0,
    isAdmin: (me?.role === 'admin' || isOwner) && !viewAsMember,
    isOwner: isOwner && !viewAsMember,
    categories,
    category: (id) => categoryInfo(id, categories),
    holder: byId.get(data.trip.fund_holder_member_id ?? ''),
    member: (id) => (id ? byId.get(id) : undefined),
    plan: settlePlan(summary.balances, data.members, data.settlements),
  }
}

/** Every trip on this phone, newest first. */
export function useTripViews(): TripView[] {
  const trips = useTripsData()
  const { userId } = useSession()
  const viewAsMember = useViewAsMemberPref()
  return useMemo(() => trips.map((d) => buildTripView(d, userId, viewAsMember)), [trips, userId, viewAsMember])
}

export function useTripView(tripId: string | undefined): TripView | undefined {
  const data = useTripsData().find((d) => d.trip.id === tripId)
  const { userId } = useSession()
  const viewAsMember = useViewAsMemberPref()
  return useMemo(() => (data ? buildTripView(data, userId, viewAsMember) : undefined), [data, userId, viewAsMember])
}

export const useViewAsMember = useViewAsMemberPref

function subscribeOnline(cb: () => void) {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

export const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine)
