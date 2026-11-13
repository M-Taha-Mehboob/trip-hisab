import { ChevronRight, Mountain, Plus, Users } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import Modal from '../components/Modal'
import SettingsSheet from '../components/SettingsSheet'
import { buttonPrimary, cardClass, inputClass, labelClass } from '../components/styles'
import { SyncPill } from '../components/ui'
import { buildTripView, useTrips, useViewAsMember } from '../data/hooks'
import { createTrip } from '../data/store'
import { formatDateRange, formatPKR, todayISO } from '../lib/format'

export default function HomePage() {
  const trips = useTrips()
  const viewAsMember = useViewAsMember()
  const views = useMemo(() => trips.map((d) => buildTripView(d, viewAsMember)), [trips, viewAsMember])
  const active = views.filter((v) => v.data.trip.status === 'active')
  const past = views.filter((v) => v.data.trip.status !== 'active')
  const [creating, setCreating] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="mx-auto min-h-full max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-10">
      <header className="flex items-center justify-between py-2">
        <div>
          <div className="text-sm text-ink-3">Assalam o Alaikum 👋</div>
          <h1 className="text-2xl font-extrabold tracking-tight">Trip Hisab</h1>
        </div>
        <div className="flex items-center gap-2">
          <SyncPill />
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="grid h-9 w-9 place-items-center rounded-full border border-line bg-card text-sm font-bold text-primary-text"
          >
            A
          </button>
        </div>
      </header>

      {active.map((v) => {
        const { trip } = v.data
        const bal = v.myRemaining
        return (
          <Link
            key={trip.id}
            to={`/trip/${trip.id}`}
            className="mt-4 block rounded-3xl bg-linear-to-br from-primary to-primary-strong p-5 text-hero-text shadow-card active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">Active trip</span>
              <span className="flex items-center gap-1 text-xs opacity-80">
                <Users size={14} /> {v.summary.memberCount} members
              </span>
            </div>
            <div className="mt-3 text-xl font-bold text-white">{trip.name}</div>
            <div className="text-sm opacity-75">{formatDateRange(trip.start_date, trip.end_date)}</div>
            <div className="mt-5 text-sm opacity-80">Total kharcha</div>
            <div className="text-4xl font-extrabold tracking-tight text-white tabular-nums">{formatPKR(v.summary.total)}</div>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/12 px-4 py-3">
              <span className="text-sm">
                {bal > 0 ? 'Aap ko milenge' : bal < 0 ? 'Aap ne dene hain' : 'Aapka hisab barabar'}
              </span>
              <span className="flex items-center gap-1 text-lg font-bold text-white tabular-nums">
                {bal !== 0 && formatPKR(Math.abs(bal))}
                <ChevronRight size={18} className="opacity-70" />
              </span>
            </div>
          </Link>
        )
      })}

      <button onClick={() => setCreating(true)} className={`${buttonPrimary} mt-4 w-full py-3`}>
        <Plus size={18} /> Nayi trip
      </button>

      {past.length > 0 && (
        <>
          <h2 className="mt-8 mb-2 px-1 text-sm font-bold tracking-wide text-ink-2 uppercase">Pichli trips</h2>
          <ul className={`${cardClass} divide-y divide-line overflow-hidden`}>
            {past.map((v) => (
              <li key={v.data.trip.id}>
                <Link to={`/trip/${v.data.trip.id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-card-2">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-primary-text">
                    <Mountain size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{v.data.trip.name}</div>
                    <div className="text-xs text-ink-3">
                      {formatDateRange(v.data.trip.start_date, v.data.trip.end_date)} · {v.summary.memberCount} members
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold tabular-nums">{formatPKR(v.summary.total)}</div>
                    <span className="mt-0.5 inline-block rounded-full bg-ok-soft px-2 py-0.5 text-[11px] font-semibold text-ok">
                      Settled
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {creating && <NewTripSheet onClose={() => setCreating(false)} />}
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

function NewTripSheet({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState(todayISO())
  const [myName, setMyName] = useState('Aap')
  const [members, setMembers] = useState('')
  const memberNames = members
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)

  function save(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !myName.trim()) return
    const id = createTrip({ name: name.trim(), startDate, myName: myName.trim(), memberNames })
    navigate(`/trip/${id}`)
  }

  return (
    <Modal title="Nayi trip" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="trip-name">Trip ka naam</label>
          <input id="trip-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Swat Kalam 2027" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor="trip-start">Shuru</label>
            <input id="trip-start" type="date" className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="trip-me">Aapka naam</label>
            <input id="trip-me" className={inputClass} value={myName} onChange={(e) => setMyName(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="trip-members">Baqi members (har line mein ek naam)</label>
          <textarea
            id="trip-members"
            rows={5}
            className={inputClass}
            value={members}
            onChange={(e) => setMembers(e.target.value)}
            placeholder={'Ali\nHamza\nUsman'}
          />
          <p className="mt-1.5 text-xs text-ink-3">
            {memberNames.length + 1} members. Ye log invite link se Google login karke apne naam se jud jayenge.
          </p>
        </div>
        <button className={`${buttonPrimary} w-full py-3`} disabled={!name.trim() || !myName.trim()}>
          Trip banayen
        </button>
      </form>
    </Modal>
  )
}
