import { createContext, useContext } from 'react'
import type { AuthUser } from '../auth/context'
import type { TripDB } from './db'
import type { TripData } from './types'

export interface Session {
  db: TripDB
  userId: string
  user: AuthUser
}

/** The signed-in user's local database. Only available inside <RequireAuth>. */
export const SessionContext = createContext<Session | null>(null)

export function useSession(): Session {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside <RequireAuth>')
  return ctx
}

/** Every trip on this phone (deleted rows left out), kept live from Dexie. */
export const TripsContext = createContext<TripData[] | null>(null)

export function useTripsData(): TripData[] {
  const ctx = useContext(TripsContext)
  if (!ctx) throw new Error('useTripsData must be used inside <RequireAuth>')
  return ctx
}
