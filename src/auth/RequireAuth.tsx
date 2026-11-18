import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, type ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { isAlive, openTripDB, type TripDB } from '../data/db'
import { SessionContext, TripsContext } from '../data/session'
import { bindStore } from '../data/store'
import type { TripData } from '../data/types'
import { FullScreenMessage } from '../components/ui'
import SyncProvider from '../sync/SyncProvider'
import { useAuth } from './context'

/** Layout route: sends signed-out users to /login, opens their local database and starts sync. */
export default function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const userId = user?.id
  const db = useMemo(() => (userId ? openTripDB(userId) : null), [userId])
  const session = useMemo(() => (user && db ? { db, userId: user.id, user } : null), [user, db])
  if (session) bindStore(session.db, session.userId)

  if (loading) return <FullScreenMessage>Loading…</FullScreenMessage>
  if (!session) {
    const next = location.pathname + location.search
    return <Navigate to={next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`} replace />
  }

  return (
    <SessionContext.Provider value={session}>
      <SyncProvider>
        <TripsGate db={session.db}>
          <Outlet />
        </TripsGate>
      </SyncProvider>
    </SessionContext.Provider>
  )
}

/** Loads all trips from the phone once, then keeps them live; pages read them synchronously. */
function TripsGate({ db, children }: { db: TripDB; children: ReactNode }) {
  const trips = useLiveQuery(() => loadTrips(db), [db])
  if (!trips) return <FullScreenMessage>Loading…</FullScreenMessage>
  return <TripsContext.Provider value={trips}>{children}</TripsContext.Provider>
}

async function loadTrips(db: TripDB): Promise<TripData[]> {
  const [trips, members, categories, expenses, contributions, settlements] = await Promise.all([
    db.trips.toArray(),
    db.trip_members.toArray(),
    db.trip_categories.toArray(),
    db.expenses.toArray(),
    db.contributions.toArray(),
    db.settlements.toArray(),
  ])
  const byTrip = <T extends { trip_id: string; deleted_at: string | null }>(rows: T[]) => {
    const map = new Map<string, T[]>()
    for (const r of rows) if (isAlive(r)) map.set(r.trip_id, [...(map.get(r.trip_id) ?? []), r])
    return (tripId: string) => map.get(tripId) ?? []
  }
  const m = byTrip(members)
  const cat = byTrip(categories)
  const e = byTrip(expenses)
  const c = byTrip(contributions)
  const s = byTrip(settlements)
  return trips
    .filter(isAlive)
    .sort((a, b) => b.start_date.localeCompare(a.start_date) || b.created_at.localeCompare(a.created_at))
    .map((trip) => ({
      trip,
      members: m(trip.id).sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id)),
      categories: cat(trip.id).sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)),
      expenses: e(trip.id),
      contributions: c(trip.id),
      settlements: s(trip.id),
    }))
}
