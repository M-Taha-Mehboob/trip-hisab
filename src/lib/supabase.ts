import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** False until .env.local has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. */
export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  console.warn('Supabase is not configured: copy .env.example to .env.local and fill in the keys.')
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey, {
      // PKCE: Google sends the user back with ?code=..., which the client swaps for a session on load.
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    })
  : null

export const RECEIPTS_BUCKET = 'receipts'
