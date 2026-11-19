// Phone notifications (Web Push). The subscription is saved in Supabase (migration 006); the
// notify-new-trip Edge Function sends "Aap ek naye trip mein add ho gaye" to it.

import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

export type PushState = 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on'

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

export const pushSupported = () =>
  Boolean(vapidKey && supabase && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window)

async function currentSubscription() {
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return isIOS() && !isStandalone() && vapidKey ? 'ios-install' : 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const sub = Notification.permission === 'granted' ? await currentSubscription() : null
  return sub ? 'on' : 'off'
}

function base64UrlToBytes(s: string) {
  const b64 = (s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

async function save(sub: PushSubscription) {
  const json = sub.toJSON()
  const { error } = await supabase!.rpc('save_push_subscription', {
    p_endpoint: sub.endpoint,
    p_p256dh: json.keys?.p256dh ?? '',
    p_auth: json.keys?.auth ?? '',
  })
  if (error) throw new Error(error.message)
}

/** Asks for permission (must run from a tap) and saves this phone. Returns the new state. */
export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return getPushState()
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off'
  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(vapidKey!) }))
  await save(sub)
  return 'on'
}

export async function disablePush(): Promise<PushState> {
  const sub = await currentSubscription()
  if (sub) {
    await supabase?.rpc('delete_push_subscription', { p_endpoint: sub.endpoint })
    await sub.unsubscribe()
  }
  return 'off'
}

/** Re-saves an existing subscription (after login on a shared phone, or a key rotation). */
export async function refreshPush() {
  if (!pushSupported() || Notification.permission !== 'granted') return
  const sub = await currentSubscription()
  if (sub) await save(sub).catch(() => {})
}

export function usePushState() {
  const [state, setState] = useState<PushState | null>(null)
  useEffect(() => {
    let alive = true
    void getPushState().then((s) => alive && setState(s))
    return () => {
      alive = false
    }
  }, [])
  return [state, setState] as const
}
