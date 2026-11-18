import { useSyncExternalStore } from 'react'

// Three looks, one per time of day. "auto" follows the phone's clock; the others pin one look on
// this phone only (Settings). Applied as <html data-theme="...">; colours live in src/index.css.

export type ThemeName = 'glacier' | 'sunset' | 'night'
export type ThemePref = 'auto' | ThemeName

export const THEMES: { id: ThemePref; label: string; hint: string }[] = [
  { id: 'auto', label: 'Auto', hint: 'Waqt ke hisab se' },
  { id: 'glacier', label: 'Glacier', hint: 'Din' },
  { id: 'sunset', label: 'Sunset', hint: 'Shaam' },
  { id: 'night', label: 'Raat', hint: 'Raat' },
]

/** Glacier 6:00–16:29, Sunset 16:30–19:29, Night 19:30–5:59 (phone's local time). */
export function themeForTime(date: Date): ThemeName {
  const minutes = date.getHours() * 60 + date.getMinutes()
  if (minutes >= 6 * 60 && minutes < 16 * 60 + 30) return 'glacier'
  if (minutes >= 16 * 60 + 30 && minutes < 19 * 60 + 30) return 'sunset'
  return 'night'
}

/** Status-bar colour per theme (matches each theme's --surface). */
const BAR_COLOR: Record<ThemeName, string> = { glacier: '#f2f7fb', sunset: '#fff7f0', night: '#0e1330' }

/** The app icon drawn in this theme's colours (public/, made by scripts/make-icons.cjs). */
export const themeIcon = (theme: ThemeName) => `/favicon-${theme}.svg`

const KEY = 'trip-hisab:theme'
const listeners = new Set<() => void>()

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'glacier' || v === 'sunset' || v === 'night' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

let pref: ThemePref = readPref()
let current: ThemeName = pref === 'auto' ? themeForTime(new Date()) : pref

function apply() {
  const root = document.documentElement
  if (root.dataset.theme !== current) root.dataset.theme = current
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR_COLOR[current])
  // Browser-tab icon follows the theme (the installed home-screen icon can't change; it shows all three).
  document.querySelector('link[rel="icon"]')?.setAttribute('href', themeIcon(current))
}

function update() {
  const next = pref === 'auto' ? themeForTime(new Date()) : pref
  if (next === current) return
  current = next
  apply()
  listeners.forEach((l) => l())
}

/** Call once before the first render (no flash of the wrong theme), then it follows the clock. */
export function startTheme() {
  apply()
  setInterval(update, 60_000)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') update()
  })
}

export function setThemePref(next: ThemePref) {
  pref = next
  try {
    localStorage.setItem(KEY, next)
  } catch {
    // private mode: only for this visit
  }
  update()
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The theme showing now. */
export const useTheme = () => useSyncExternalStore(subscribe, () => current)

/** What the user picked in Settings. */
export const useThemePref = () => useSyncExternalStore(subscribe, () => pref)
