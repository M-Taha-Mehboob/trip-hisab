import { ArrowRight } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { buttonPrimary, cardClass } from '../components/styles'
import { Avatar, BalancePill, HolderBadge, SectionTitle } from '../components/ui'
import { useTripView } from '../data/hooks'
import { formatNumber, formatPKR } from '../lib/format'

export default function HisabPage() {
  const { tripId } = useParams()
  const view = useTripView(tripId)!
  const { summary, data, me } = view
  const lene = summary.balances.filter((b) => b.balance > 0).reduce((s, b) => s + b.balance, 0)
  const dene = -summary.balances.filter((b) => b.balance < 0).reduce((s, b) => s + b.balance, 0)
  const totalTransfers = view.plan.paid.length + view.plan.open.length

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className={`${cardClass} p-4`}>
          <div className="text-sm text-ink-3">Lene wale</div>
          <div className="mt-1 text-2xl font-extrabold text-ok tabular-nums">{formatPKR(lene)}</div>
          <div className="text-xs text-ink-3">{summary.balances.filter((b) => b.balance > 0).length} members</div>
        </div>
        <div className={`${cardClass} p-4`}>
          <div className="text-sm text-ink-3">Dene wale</div>
          <div className="mt-1 text-2xl font-extrabold text-danger tabular-nums">{formatPKR(dene)}</div>
          <div className="text-xs text-ink-3">{summary.balances.filter((b) => b.balance < 0).length} members</div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-primary-soft px-4 py-3 text-sm text-primary-text">
        Total {formatPKR(summary.total)} ÷ {summary.memberCount} = <b>{formatPKR(summary.perHead)}</b> per head
        {summary.total % Math.max(1, summary.memberCount) !== 0 && ' (baqi rupay pehle members par)'}
      </div>

      <SectionTitle title="Har member ka hisab" />
      <ul className={`${cardClass} divide-y divide-line overflow-hidden`}>
        {summary.balances.map((b) => {
          const m = view.member(b.memberId)!
          const isHolder = m.id === data.trip.fund_holder_member_id
          return (
            <li key={b.memberId} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={m.display_name} fund={isHolder} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold">{m.display_name}</span>
                  {m.id === me?.id && m.display_name !== 'Aap' && <span className="text-xs text-ink-3">(aap)</span>}
                  {isHolder && <HolderBadge />}
                </div>
                <div className="mt-0.5 text-xs text-ink-3">
                  Contribution {formatNumber(b.contributed)} · Jeb se {formatNumber(b.paidPersonally)}
                  {isHolder && b.fundHeld !== 0 && ` · Cash paas ${formatNumber(b.fundHeld)}`}
                </div>
              </div>
              <BalancePill amount={b.balance} />
            </li>
          )
        })}
      </ul>
      <p className="mt-2 px-1 text-xs text-ink-3">
        Balance = contribution + jeb se − share{view.holder ? ` (${view.holder.display_name}: − baqi fund cash bhi)` : ''}. + wale ko milenge, − wale ne dene hain.
      </p>

      {totalTransfers > 0 && (
        <Link to={`/trip/${tripId}/hisab/settle`} className={`${buttonPrimary} mt-5 w-full py-3`}>
          Settle up · {view.plan.paid.length} / {totalTransfers} clear <ArrowRight size={18} />
        </Link>
      )}
    </>
  )
}
