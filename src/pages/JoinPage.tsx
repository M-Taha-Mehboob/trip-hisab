import { UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { buttonPrimary, buttonSecondary, cardClass } from '../components/styles'
import TripHero from '../components/TripHero'
import { Avatar, FullScreenMessage } from '../components/ui'
import { useOnline } from '../data/hooks'
import { useSession } from '../data/session'
import { supabase } from '../lib/supabase'
import { useSync } from '../sync/context'

interface PreviewRow {
  trip_id: string
  trip_name: string
  member_id: string | null
  display_name: string | null
  already_member: boolean
}

type Preview = { tripId: string; tripName: string; names: { id: string; name: string }[]; alreadyMember: boolean }

/** /join/:code from the WhatsApp invite: pick your name from the trip's list (or join as a new member). */
export default function JoinPage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const online = useOnline()
  const { user } = useSession()
  const { syncNow } = useSync()
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase || !online) return
    let cancelled = false
    supabase.rpc('invite_preview', { p_code: code }).then(({ data, error: err }) => {
      if (cancelled) return
      if (err) return setError(err.message)
      const rows = (data ?? []) as PreviewRow[]
      if (rows.length === 0) return setError('Ye invite link galat ya purana hai. Dost se naya link maangein.')
      setPreview({
        tripId: rows[0].trip_id,
        tripName: rows[0].trip_name,
        alreadyMember: rows[0].already_member,
        names: rows.filter((r) => r.member_id).map((r) => ({ id: r.member_id!, name: r.display_name ?? '' })),
      })
    })
    return () => {
      cancelled = true
    }
  }, [code, online])

  async function open(tripId: string) {
    await syncNow()
    navigate(`/trip/${tripId}`, { replace: true })
  }

  async function join(memberId: string | null) {
    if (!supabase) return
    setBusy(memberId ?? 'new')
    setError(null)
    const { data, error: err } = await supabase.rpc('join_trip', { p_code: code, p_member_id: memberId })
    if (err) {
      setError(err.message)
      setBusy(null)
      return
    }
    await open(data as string)
  }

  if (!online) {
    return (
      <FullScreenMessage>
        Trip join karne ke liye internet chahiye. Net aate hi ye page dobara kholen.
        <Link to="/" className="font-semibold text-primary-text">Home</Link>
      </FullScreenMessage>
    )
  }
  if (error && !preview) {
    return (
      <FullScreenMessage>
        <span className="text-danger">{error}</span>
        <Link to="/" className="font-semibold text-primary-text">Home</Link>
      </FullScreenMessage>
    )
  }
  if (!preview) return <FullScreenMessage>Invite check ho raha hai…</FullScreenMessage>

  return (
    <div className="mx-auto min-h-full max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-10">
      <TripHero className="p-5">
        <div className="text-sm">Aap ko bulaya gaya hai</div>
        <div className="mt-1 text-2xl font-extrabold tracking-tight text-hero-ink">{preview.tripName}</div>
        <div className="mt-16 inline-block rounded-xl bg-hero-chip px-3 py-1.5 text-sm text-hero-chip-ink backdrop-blur-sm">Login: {user.email}</div>
      </TripHero>

      {preview.alreadyMember ? (
        <div className={`${cardClass} mt-4 space-y-3 p-5`}>
          <p className="font-semibold">Aap pehle se is trip mein hain.</p>
          <button className={`${buttonPrimary} w-full py-3`} disabled={busy !== null} onClick={() => { setBusy('open'); void open(preview.tripId) }}>
            {busy ? 'Khul rahi hai…' : 'Trip kholen'}
          </button>
        </div>
      ) : (
        <>
          <h2 className="mt-6 mb-2 px-1 text-sm font-bold tracking-wide text-ink-2 uppercase">Aap kaun hain?</h2>
          {preview.names.length > 0 ? (
            <ul className={`${cardClass} divide-y divide-line overflow-hidden`}>
              {preview.names.map((m) => (
                <li key={m.id}>
                  <button
                    disabled={busy !== null}
                    onClick={() => void join(m.id)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-card-2 disabled:opacity-60"
                  >
                    <Avatar name={m.name} />
                    <span className="flex-1 font-semibold">Main {m.name} hoon</span>
                    {busy === m.id && <span className="text-sm text-ink-3">Join ho raha hai…</span>}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-1 text-sm text-ink-3">List mein koi khali naam nahi bacha.</p>
          )}
          <button className={`${buttonSecondary} mt-3 w-full py-3`} disabled={busy !== null} onClick={() => void join(null)}>
            <UserPlus size={18} /> {busy === 'new' ? 'Join ho raha hai…' : 'Mera naam list mein nahi, naye member ki tarah join karein'}
          </button>
          <p className="mt-2 px-1 text-xs text-ink-3">
            Sirf apna naam chunein. Ghalat naam chun liya ho to trip ke admin ko batayen.
          </p>
        </>
      )}
      {error && <p className="mt-3 rounded-xl bg-danger-soft p-3 text-sm font-medium text-danger">{error}</p>}
    </div>
  )
}
