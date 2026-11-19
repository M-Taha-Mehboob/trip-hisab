// Edge Function notify-new-trip: called by the trip_members trigger (migration 006) when someone with a
// login is added to a trip. Sends "Aap ek naye trip mein add ho gaye: <trip>. Enjoy!" to their phones.
//
// Secrets (supabase secrets set ...): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...),
// PUSH_HOOK_SECRET (same value as the Vault secret push_hook_secret). SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided by Supabase. Deploy with --no-verify-jwt (the trigger sends
// x-hook-secret instead of a user token).

import { createClient } from 'npm:@supabase/supabase-js@2.49.4'
import webpush from 'npm:web-push@3.6.7'

const env = (name: string) => {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`Missing secret ${name}`)
  return v
}

webpush.setVapidDetails(env('VAPID_SUBJECT'), env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'))
const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
const hookSecret = env('PUSH_HOOK_SECRET')

Deno.serve(async (req) => {
  if (req.method !== 'POST' || req.headers.get('x-hook-secret') !== hookSecret) {
    return new Response('Forbidden', { status: 403 })
  }

  const { trip_id, user_id } = (await req.json()) as { trip_id?: string; user_id?: string }
  if (!trip_id || !user_id) return new Response('Bad request', { status: 400 })

  const { data: trip } = await admin.from('trips').select('name, deleted_at').eq('id', trip_id).maybeSingle()
  if (!trip || trip.deleted_at) return Response.json({ sent: 0 })

  const { data: subs } = await admin.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', user_id)

  const payload = JSON.stringify({
    title: '🎉 Naya trip!',
    body: `Aap ek naye trip mein add ho gaye: ${trip.name}. Enjoy! 🏔️`,
    url: `/trip/${trip_id}`,
    tag: `trip-${trip_id}`,
  })

  let sent = 0
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
        TTL: 60 * 60 * 24,
      })
      sent++
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      // Phone unsubscribed or app uninstalled: forget it.
      if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
      else console.error('push failed', status, err)
    }
  }
  return Response.json({ sent })
})
