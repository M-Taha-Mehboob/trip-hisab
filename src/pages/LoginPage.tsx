import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/context'
import { cardClass } from '../components/styles'
import { isSupabaseConfigured } from '../lib/supabase'

const OAUTH_ERROR_KEYS = ['error', 'error_code', 'error_description']

/**
 * Where to go after login (a path inside this app only), and the error Supabase sent back when a
 * Google login failed (it lands on that path as ?error_description=..., then gets sent here).
 */
function parseNext(params: URLSearchParams) {
  const raw = params.get('next')
  const url = new URL(raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/', window.location.origin)
  const code = params.get('error_code') ?? url.searchParams.get('error_code')
  const description = params.get('error_description') ?? url.searchParams.get('error_description')
  for (const k of OAUTH_ERROR_KEYS) url.searchParams.delete(k)
  let error: string | null = null
  if (code === 'signup_disabled') {
    error =
      'Supabase mein naye users ka signup band hai. Authentication → Sign In / Providers → "Allow new users to sign up" ON karein.'
  } else if (description) {
    error = `Login nahi hua: ${description}`
  }
  return { next: url.pathname + url.search, error }
}

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth()
  const [params] = useSearchParams()
  const parsed = parseNext(params)
  const next = parsed.next
  const joining = next.startsWith('/join/')
  const [error, setError] = useState<string | null>(parsed.error)
  const [busy, setBusy] = useState(false)

  if (!loading && user) return <Navigate to={next} replace />

  async function onGoogle() {
    setBusy(true)
    setError(null)
    const message = await signInWithGoogle(next)
    // On success the browser is already leaving for Google.
    if (message) {
      setError(message)
      setBusy(false)
    }
  }

  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-80 rounded-b-[2.5rem] bg-linear-to-br from-primary to-primary-strong" />
      <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10" />

      <div className="relative mx-auto flex min-h-full max-w-sm flex-col justify-center gap-6 px-6 py-10">
        <div className="text-center text-hero-text">
          <img src="/favicon.svg" alt="" className="mx-auto mb-3 h-20 w-20 rounded-[1.4rem] shadow-lg ring-4 ring-white/20" />
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Trip Hisab</h1>
          <p className="mt-1 text-sm opacity-85">Trip ka kharcha, Group Fund aur hisab — sab ek jagah</p>
        </div>

        <div className={`${cardClass} space-y-4 p-5`}>
          <div>
            <h2 className="text-lg font-bold">{joining ? 'Trip join karein' : 'Login'}</h2>
            <p className="mt-1 text-sm text-ink-3">
              {joining
                ? 'Dost ne aap ko trip mein bulaya hai. Google se login karein, phir list mein apna naam chunein.'
                : 'Apni Google ID se login karein. Password ki zaroorat nahi.'}
            </p>
          </div>
          {!isSupabaseConfigured && (
            <p className="rounded-xl bg-warn-soft p-3 text-sm text-warn">
              Supabase keys missing: <code>.env.example</code> ko <code>.env.local</code> mein copy karke bharein.
            </p>
          )}
          {error && <p className="rounded-xl bg-danger-soft p-3 text-sm font-medium text-danger">{error}</p>}
          <button
            type="button"
            onClick={onGoogle}
            disabled={busy || !isSupabaseConfigured}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-card px-4 py-3 font-semibold text-ink shadow-sm transition active:scale-[0.98] active:bg-card-2 disabled:pointer-events-none disabled:opacity-50"
          >
            <GoogleLogo />
            {busy ? 'Google khul raha hai…' : 'Google se login'}
          </button>
          <p className="text-center text-xs text-ink-3">Login ke baad app offline bhi chalti hai.</p>
        </div>
      </div>
    </div>
  )
}

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}
