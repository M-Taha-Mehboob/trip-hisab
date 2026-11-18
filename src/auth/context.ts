import { createContext, useContext } from 'react'

export interface AuthUser {
  id: string
  email: string
  /** Full name from Google. */
  name: string
  avatarUrl: string | null
}

export interface AuthState {
  user: AuthUser | null
  /** True until the stored session has been checked on startup. */
  loading: boolean
  /** Goes to Google; comes back to `returnTo` (a path in this app). Returns an error message if it can't start. */
  signInWithGoogle: (returnTo: string) => Promise<string | null>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
