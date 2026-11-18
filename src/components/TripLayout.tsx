import { ArrowLeft, House, Receipt, Scale, UserPlus, Wallet, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useParams } from 'react-router'
import { useTripView } from '../data/hooks'
import InviteSheet from './InviteSheet'
import { FullScreenMessage, SyncPill } from './ui'

type Tab = { to: string; label: string; icon: LucideIcon; end?: boolean }

const tabs: Tab[] = [
  { to: '', label: 'Home', icon: House, end: true },
  { to: 'kharche', label: 'Kharche', icon: Receipt },
  { to: 'fund', label: 'Group Fund', icon: Wallet },
  { to: 'hisab', label: 'Hisab', icon: Scale },
]

/** Header (back to all trips, trip name, sync pill) + bottom nav for the screens inside one trip. */
export default function TripLayout() {
  const { tripId } = useParams()
  const view = useTripView(tripId)
  const [inviting, setInviting] = useState(false)
  if (!view) {
    return (
      <FullScreenMessage>
        Ye trip is phone par nahi mili (shayad abhi sync ho rahi hai).
        <Link to="/" className="font-semibold text-primary-text">Sab trips</Link>
      </FullScreenMessage>
    )
  }

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col">
      <header className="sticky top-0 z-20 bg-surface/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex items-center gap-2 px-3 py-3">
          <Link to="/" aria-label="Sab trips" className="grid h-9 w-9 place-items-center rounded-xl text-ink-2 active:bg-card-2">
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-extrabold tracking-tight">{view.data.trip.name}</div>
          </div>
          <SyncPill />
          {view.isAdmin && (
            <button
              onClick={() => setInviting(true)}
              aria-label="Doston ko bulayen"
              className="grid h-9 w-9 place-items-center rounded-xl text-primary-text active:bg-card-2"
            >
              <UserPlus size={20} />
            </button>
          )}
        </div>
      </header>
      <main className="flex-1 px-4 pt-1 pb-28">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        <ul className="mx-auto grid max-w-xl grid-cols-4 gap-1 rounded-2xl border border-line bg-card/90 p-1.5 shadow-card backdrop-blur-md">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <li key={label}>
              <NavLink
                to={`/trip/${tripId}${to ? `/${to}` : ''}`}
                end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold transition ${
                    isActive ? 'bg-primary-soft text-primary-text' : 'text-ink-3'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={22} strokeWidth={isActive ? 2.4 : 1.8} />
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {inviting && <InviteSheet view={view} onClose={() => setInviting(false)} />}
    </div>
  )
}
