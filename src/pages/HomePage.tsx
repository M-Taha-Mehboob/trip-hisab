import { Check, ChevronRight, Mountain, Plus, Users } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import Modal from '../components/Modal'
import SettingsSheet from '../components/SettingsSheet'
import { PushBanner } from '../components/PushToggle'
import { buttonPrimary, cardClass, inputClass, labelClass } from '../components/styles'
import TripHero from '../components/TripHero'
import { SyncPill } from '../components/ui'
import { UserAvatar } from '../components/UserAvatar'
import { Avatar } from '../components/ui'
import { useTripViews } from '../data/hooks'
import { useSession, useTripsData } from '../data/session'
import { createTrip, type PastPerson } from '../data/store'
import { formatDateRange, formatPKR, todayISO } from '../lib/format'

export default function HomePage() {
  const views = useTripViews()
  const { user } = useSession()
  const firstName = user.name.split(' ')[0]
  const active = views.filter((v) => v.data.trip.status === 'active')
  const past = views.filter((v) => v.data.trip.status !== 'active')
  const [creating, setCreating] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="mx-auto min-h-full max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-10">
      <header className="flex items-center justify-between py-2">
        <div>
          <div className="text-sm text-ink-3">Assalam o Alaikum{firstName ? `, ${firstName}` : ''} 👋</div>
          <h1 className="text-2xl font-extrabold tracking-tight">Trip Hisab</h1>
        </div>
        <div className="flex items-center gap-2">
          <SyncPill />
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="rounded-full ring-2 ring-line"
          >
            <UserAvatar size={36} />
          </button>
        </div>
      </header>

      <PushBanner />

      {active.map((v) => {
        const { trip } = v.data
        const bal = v.myRemaining
        return (
          <Link key={trip.id} to={`/trip/${trip.id}`} className="mt-4 block active:scale-[0.99]">
            <TripHero className="p-5">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-hero-badge px-2.5 py-1 text-xs font-semibold text-hero-badge-ink">Active safar</span>
                <span className="flex items-center gap-1 text-xs font-medium">
                  <Users size={14} /> {v.summary.memberCount} log
                </span>
              </div>
              <div className="mt-3 text-2xl font-extrabold tracking-tight text-hero-ink">{trip.name}</div>
              <div className="text-sm">{formatDateRange(trip.start_date, trip.end_date)}</div>
              <div className="mt-4 text-sm">Total kharcha</div>
              <div className="text-4xl font-extrabold tracking-tight text-hero-ink tabular-nums">{formatPKR(v.summary.total)}</div>
              <div className="mt-24 flex items-center justify-between rounded-2xl bg-hero-chip px-4 py-3 text-hero-chip-ink backdrop-blur-sm">
                <span className="text-sm">
                  {bal > 0 ? 'Aap ko milenge' : bal < 0 ? 'Aap ne dene hain' : 'Aapka hisab barabar'}
                </span>
                <span className="flex items-center gap-1 text-lg font-bold tabular-nums">
                  {bal !== 0 && formatPKR(Math.abs(bal))}
                  <ChevronRight size={18} className="opacity-70" />
                </span>
              </div>
            </TripHero>
          </Link>
        )
      })}

      {views.length === 0 && (
        <div className="mt-6 rounded-3xl border border-dashed border-line bg-card px-5 py-8 text-center">
          <Mountain size={32} className="mx-auto text-primary-text" />
          <div className="mt-3 font-bold">Abhi koi trip nahi</div>
          <p className="mt-1 text-sm text-ink-3">
            Nayi trip banayen, ya dost ne trip banayi hai to us se WhatsApp par invite link maangein.
          </p>
        </div>
      )}

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
  const { user } = useSession()
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState(todayISO())
  const [myName, setMyName] = useState(user.name.split(' ')[0] || '')
  const [members, setMembers] = useState('')
  const memberNames = members
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)

  const pastPeople = usePastPeople()
  const [picked, setPicked] = useState<Set<string>>(() => new Set(pastPeople.map((p) => p.userId)))
  const togglePicked = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const pickedPeople = pastPeople.filter((p) => picked.has(p.userId))

  const [busy, setBusy] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !myName.trim() || busy) return
    setBusy(true)
    try {
      const id = await createTrip({ name: name.trim(), startDate, myName: myName.trim(), myAvatarUrl: user.avatarUrl, pastPeople: pickedPeople, memberNames })
      navigate(`/trip/${id}`)
    } catch (err) {
      window.alert(`Trip nahi bani: ${err instanceof Error ? err.message : String(err)}`)
      setBusy(false)
    }
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
        {pastPeople.length > 0 && (
          <div>
            <div className={labelClass}>Pichli trips ke dost</div>
            <div className="flex flex-wrap gap-2">
              {pastPeople.map((p) => {
                const on = picked.has(p.userId)
                return (
                  <button
                    key={p.userId}
                    type="button"
                    onClick={() => togglePicked(p.userId)}
                    aria-pressed={on}
                    className={`flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-sm font-medium ${
                      on ? 'border-primary bg-primary-soft text-primary-text' : 'border-line bg-card text-ink-2'
                    }`}
                  >
                    <Avatar name={p.name} size={26} />
                    {p.name}
                    {on && <Check size={14} />}
                  </button>
                )
              })}
            </div>
            <p className="mt-1.5 text-xs text-ink-3">Tick wale log seedha trip mein aa jayenge, link bhejne ki zaroorat nahi.</p>
          </div>
        )}
        <div>
          <label className={labelClass} htmlFor="trip-members">Naye members (har line mein ek naam)</label>
          <textarea
            id="trip-members"
            rows={5}
            className={inputClass}
            value={members}
            onChange={(e) => setMembers(e.target.value)}
            placeholder={'Ali\nHamza\nUsman'}
          />
          <p className="mt-1.5 text-xs text-ink-3">
            {memberNames.length + pickedPeople.length + 1} members. Naye log invite link se Google login karke apne naam se jud jayenge.
          </p>
        </div>
        <button className={`${buttonPrimary} w-full py-3`} disabled={!name.trim() || !myName.trim() || busy}>
          Trip banayen
        </button>
      </form>
    </Modal>
  )
}

/** Everyone with a login who was in one of my trips (not me), newest name first, one entry per person. */
function usePastPeople(): PastPerson[] {
  const trips = useTripsData()
  const { userId } = useSession()
  return useMemo(() => {
    const seen = new Map<string, PastPerson>()
    for (const t of trips) // newest trip first, so its name wins
      for (const m of t.members)
        if (m.user_id && m.user_id !== userId && !seen.has(m.user_id))
          seen.set(m.user_id, { userId: m.user_id, name: m.display_name, avatarUrl: m.avatar_url })
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [trips, userId])
}
