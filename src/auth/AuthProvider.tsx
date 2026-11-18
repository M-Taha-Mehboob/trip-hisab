import { isAuthRetryableFetchError, type User } from '@supabase/supabase-js'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext, type AuthState, type AuthUser } from './context'

// The last signed-in user, so the app still opens offline (in the mountains) when the access token
// has expired and can't be refreshed. Supabase keeps the session itself; this is only the fallback.
const CACHE_KEY = 'trip-hisab:last-user'

function readCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

function cacheUser(user: AuthUser | null) {
  try {
    if (user) localStorage.setItem(CACHE_KEY, JSON.stringify(user))
    else localStorage.removeItem(CACHE_KEY)
  } catch {
    // storage unavailable (private mode): offline fallback just won't work
  }
}

function toAuthUser(u: User): AuthUser {
  const meta = u.user_metadata ?? {}
  const email = u.email ?? ''
  return {
    id: u.id,
    email,
    name: String(meta.full_name ?? meta.name ?? email.split('@')[0] ?? ''),
    avatarUrl: (meta.avatar_url ?? meta.picture ?? null) as string | null,
  }
}

const same = (a: AuthUser | null, b: AuthUser) =>
  a?.id === b.id && a.email === b.email && a.name === b.name && a.avatarUrl === b.avatarUrl

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(supabase !== null)

  useEffect(() => {
    if (!supabase) return
    const client = supabase

    // Waits for the ?code=... from Google to be exchanged when coming back from the login.
    client.auth.getSession().then(({ data, error }) => {
      if (data.session) {
        const u = toAuthUser(data.session.user)
        cacheUser(u)
        setUser(u)
      } else if (error && isAuthRetryableFetchError(error)) {
        setUser(readCachedUser()) // offline with an expired token
      } else if (!navigator.onLine) {
        setUser(readCachedUser())
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        cacheUser(null)
        setUser(null)
      } else if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
        const u = toAuthUser(session.user)
        cacheUser(u)
        setUser((prev) => (same(prev, u) ? prev : u))
      }
      // INITIAL_SESSION is handled by getSession above (it can't tell "offline" from "signed out").
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      async signInWithGoogle(returnTo) {
        if (!supabase) return 'Supabase keys missing (.env.local).'
        if (!navigator.onLine) return 'Internet nahi hai. Pehli dafa login ke liye net chahiye.'
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin + returnTo, queryParams: { prompt: 'select_account' } },
        })
        return error ? error.message : null
      },
      async signOut() {
        cacheUser(null)
        setUser(null)
        // 'local' clears this phone's session without needing the network.
        await supabase?.auth.signOut({ scope: 'local' })
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
