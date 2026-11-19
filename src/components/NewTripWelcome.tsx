import { PartyPopper } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import type { LocalTrip } from '../data/db'
import { useSession, useTripsData } from '../data/session'
import { formatDateRange } from '../lib/format'
import Modal from './Modal'
import { buttonPrimary } from './styles'

// "Aap ek naye trip mein add ho gaye: Lahore Trip. Enjoy!" Shown once per trip, when sync brings a trip
// someone else made (they added you from an earlier trip). Seen trip ids live in localStorage per login;
// on the very first run every trip already on the phone counts as seen.

const key = (userId: string) => `trip-hisab:seen-trips:${userId}`

function readSeen(userId: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(key(userId))
    return raw ? new Set(JSON.parse(raw) as string[]) : null
  } catch {
    return null
  }
}

function writeSeen(userId: string, ids: Set<string>) {
  try {
    localStorage.setItem(key(userId), JSON.stringify([...ids]))
  } catch {
    // private mode: the welcome may show again, that's fine
  }
}

export default function NewTripWelcome() {
  const trips = useTripsData()
  const { userId } = useSession()
  const location = useLocation()
  const navigate = useNavigate()
  const [, rerender] = useState(0)

  const seen = readSeen(userId)
  const unseen = seen ? trips.filter((t) => !seen.has(t.trip.id)) : []
  // Trips I made, or the one I'm already looking at (just joined by link), need no welcome.
  const quiet = unseen.filter(
    (t) => (t.trip as LocalTrip).created_by === userId || location.pathname.startsWith(`/trip/${t.trip.id}`),
  )
  const show = unseen.find((t) => !quiet.includes(t))

  useEffect(() => {
    if (!seen) writeSeen(userId, new Set(trips.map((t) => t.trip.id)))
    else if (quiet.length) writeSeen(userId, new Set([...seen, ...quiet.map((t) => t.trip.id)]))
  })

  if (!show || location.pathname.startsWith('/join')) return null

  const close = (open: boolean) => {
    writeSeen(userId, new Set([...(readSeen(userId) ?? []), show.trip.id]))
    rerender((n) => n + 1)
    if (open) navigate(`/trip/${show.trip.id}`)
  }

  return (
    <Modal title="Naya trip! 🎉" onClose={() => close(false)}>
      <div className="text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-primary-text">
          <PartyPopper size={30} />
        </span>
        <p className="mt-4 text-ink-2">Aap ek naye trip mein add ho gaye:</p>
        <div className="mt-1 text-2xl font-extrabold tracking-tight">{show.trip.name}</div>
        <div className="text-sm text-ink-3">{formatDateRange(show.trip.start_date, show.trip.end_date)}</div>
        <p className="mt-3 text-lg font-semibold">Enjoy! 🏔️</p>
        <button onClick={() => close(true)} className={`${buttonPrimary} mt-5 w-full py-3`}>
          Trip kholo
        </button>
      </div>
    </Modal>
  )
}
