import { ArrowLeft, ArrowRight, Check, MessageCircle } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { buttonPrimary, buttonSecondary, cardClass } from '../components/styles'
import { Avatar, ProgressBar } from '../components/ui'
import { useTripView, type TripView } from '../data/hooks'
import { setTripStatus, toggleSettlement } from '../data/store'
import { formatPKR, todayISO } from '../lib/format'

interface Row {
  key: string
  from: string
  to: string
  amount: number
  settlementId?: string
}

export default function SettlePage() {
  const { tripId } = useParams()
  const view = useTripView(tripId)!
  const { data, isAdmin } = view
  const rows: Row[] = [
    ...view.plan.paid.map((s) => ({
      key: s.id,
      from: s.from_member_id,
      to: s.to_member_id,
      amount: s.amount,
      settlementId: s.id,
    })),
    ...view.plan.open.map((t) => ({ key: `${t.fromMemberId}>${t.toMemberId}`, from: t.fromMemberId, to: t.toMemberId, amount: t.amount })),
  ]
  const done = view.plan.paid.length
  const name = (id: string) => view.member(id)?.display_name ?? '?'
  const allClear = rows.length > 0 && done === rows.length
  const canToggle = isAdmin

  return (
    <>
      <Link to={`/trip/${tripId}/hisab`} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-primary-text">
        <ArrowLeft size={16} /> Hisab
      </Link>
      <h1 className="px-1 text-xl font-extrabold">Settle up</h1>

      <section className={`${cardClass} mt-3 p-4`}>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-extrabold tabular-nums">
            {done} / {rows.length}
          </span>
          <span className="text-sm text-ink-3">payments clear</span>
        </div>
        <div className="mt-3">
          <ProgressBar value={done} max={rows.length} tone="bg-ok" />
        </div>
        <p className="mt-3 text-xs text-ink-3">
          Kam se kam {rows.length} transfers mein sab ka hisab barabar. Group Fund ka baqi cash bhi inhi mein wapas ho jata hai.
        </p>
      </section>

      {rows.length === 0 ? (
        <div className={`${cardClass} mt-4 px-4 py-8 text-center text-ink-3`}>Sab ka hisab barabar hai 🎉</div>
      ) : (
        <ul className={`${cardClass} mt-4 divide-y divide-line overflow-hidden`}>
          {rows.map((r) => {
            const paid = Boolean(r.settlementId)
            return (
              <li key={r.key} className={`flex items-center gap-3 px-4 py-3.5 ${paid ? 'bg-ok-soft/50' : ''}`}>
                <div className="flex shrink-0 items-center -space-x-2">
                  <Avatar name={name(r.from)} size={34} />
                  <Avatar name={name(r.to)} size={34} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`flex items-center gap-1 font-semibold ${paid ? 'text-ink-3 line-through' : ''}`}>
                    <span className="truncate">{name(r.from)}</span>
                    <ArrowRight size={14} className="shrink-0 text-ink-3" />
                    <span className="truncate">{name(r.to)}</span>
                  </div>
                  <div className="text-sm font-bold tabular-nums">{formatPKR(r.amount)}</div>
                </div>
                <button
                  disabled={!canToggle}
                  onClick={() => toggleSettlement(data.trip.id, r.from, r.to, r.amount, r.settlementId)}
                  aria-pressed={paid}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold transition disabled:opacity-100 ${
                    paid ? 'border-ok bg-ok text-white' : 'border-line bg-card text-ink-2'
                  }`}
                >
                  {paid && <Check size={15} />} Paid
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <a
        href={`https://wa.me/?text=${encodeURIComponent(whatsappSummary(view))}`}
        target="_blank"
        rel="noreferrer"
        className={`${buttonSecondary} mt-4 w-full py-3`}
      >
        <MessageCircle size={18} className="text-ok" /> WhatsApp par share
      </a>

      {isAdmin && data.trip.status === 'active' && allClear && (
        <button
          onClick={() => window.confirm('Trip ko Settled mark karein? Phir naye kharche add nahi honge.') && setTripStatus(data.trip.id, 'settled', todayISO())}
          className={`${buttonPrimary} mt-3 w-full py-3`}
        >
          Trip settled mark karein
        </button>
      )}
      {isAdmin && data.trip.status === 'settled' && (
        <button onClick={() => setTripStatus(data.trip.id, 'active', null)} className={`${buttonSecondary} mt-3 w-full py-3`}>
          Trip dobara kholen
        </button>
      )}
    </>
  )
}

/** Plain-text summary for WhatsApp (*bold* is WhatsApp markdown). */
function whatsappSummary(view: TripView): string {
  const { data, summary } = view
  const name = (id: string) => view.member(id)?.display_name ?? '?'
  const lines = [
    `*${data.trip.name} · Hisab*`,
    `Total kharcha: ${formatPKR(summary.total)}`,
    `Per head: ${formatPKR(summary.perHead)} (${summary.memberCount} members)`,
    `Group Fund: ${formatPKR(summary.fundCollected)} jama, ${formatPKR(summary.fundSpent)} kharch, ${formatPKR(summary.fundLeft)} baqi${
      view.holder ? ` (${view.holder.display_name} ke paas)` : ''
    }`,
    '',
    '*Settle up*',
    ...view.plan.paid.map((s) => `✅ ${name(s.from_member_id)} → ${name(s.to_member_id)}: ${formatPKR(s.amount)}`),
    ...view.plan.open.map((t) => `⬜ ${name(t.fromMemberId)} → ${name(t.toMemberId)}: ${formatPKR(t.amount)}`),
  ]
  return lines.join('\n')
}
