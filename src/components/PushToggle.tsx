import { Bell, BellOff, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { disablePush, enablePush, refreshPush, usePushState, type PushState } from '../lib/push'
import { buttonPrimary, checkboxClass } from './styles'

const hint: Record<PushState, string> = {
  on: 'Koi aap ko naye trip mein add kare to phone par message aayega',
  off: 'Koi aap ko naye trip mein add kare to phone par message aaye',
  denied: 'Phone settings mein is app ki notifications block hain. Wahan se allow karein.',
  'ios-install': 'iPhone par pehle Share → "Add to Home Screen" se app install karein, phir yahan on karein.',
  unsupported: 'Is browser mein notifications nahi chaltin.',
}

function useToggle() {
  const [state, setState] = usePushState()
  const [busy, setBusy] = useState(false)
  async function set(on: boolean) {
    setBusy(true)
    try {
      setState(await (on ? enablePush() : disablePush()))
    } catch (err) {
      window.alert(`Notifications on nahi huin: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }
  return { state, busy, set }
}

/** Settings row: phone notifications on / off for this phone. */
export default function PushToggle() {
  const { state, busy, set } = useToggle()
  if (!state) return null
  return (
    <label className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
      <span>
        <span className="block font-semibold">Phone notifications</span>
        <span className="block text-sm text-ink-3">{hint[state]}</span>
      </span>
      {(state === 'on' || state === 'off') && (
        <input
          type="checkbox"
          className={checkboxClass}
          checked={state === 'on'}
          disabled={busy}
          onChange={(e) => void set(e.target.checked)}
        />
      )}
    </label>
  )
}

const DISMISS_KEY = 'trip-hisab:push-banner-dismissed'

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/** Home: one-time ask "Naye trip ki notification chahiye?" until turned on or dismissed. */
export function PushBanner() {
  const { state, busy, set } = useToggle()
  const [dismissed, setDismissed] = useState(readDismissed)

  useEffect(() => {
    void refreshPush()
  }, [])

  if (dismissed || state !== 'off') return null

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // private mode
    }
    setDismissed(true)
  }

  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-line bg-card p-4 shadow-card">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-text">
        <Bell size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">Naye trip ki notification chahiye?</div>
        <p className="text-sm text-ink-3">Koi aap ko trip mein add kare to phone par pata chal jaye.</p>
        <div className="mt-3 flex gap-2">
          <button className={`${buttonPrimary} px-4 py-2`} disabled={busy} onClick={() => void set(true)}>
            <Bell size={16} /> On karo
          </button>
          <button className="flex items-center gap-1 px-3 text-sm text-ink-3" onClick={dismiss}>
            <BellOff size={16} /> Nahi
          </button>
        </div>
      </div>
      <button onClick={dismiss} aria-label="Band karo" className="text-ink-3">
        <X size={18} />
      </button>
    </div>
  )
}
