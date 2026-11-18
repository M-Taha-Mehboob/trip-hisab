import { Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router'
import Modal from '../components/Modal'
import { buttonFund, cardClass, inputClass, labelClass } from '../components/styles'
import { Avatar, ProgressBar, SectionTitle } from '../components/ui'
import { useTripView, type TripView } from '../data/hooks'
import { addContribution, deleteContribution, setFundHolder } from '../data/store'
import { formatDate, formatNumber, formatPKR, formatShortDate, parseAmount, todayISO } from '../lib/format'

export default function FundPage() {
  const { tripId } = useParams()
  const view = useTripView(tripId)!
  const { summary, data, holder, isAdmin } = view
  const [adding, setAdding] = useState(false)
  const [changingHolder, setChangingHolder] = useState(false)
  const canEdit = isAdmin && data.trip.status === 'active'

  const contributors = new Set(data.contributions.map((c) => c.member_id))
  const pending = data.members.filter((m) => !contributors.has(m.id))
  const list = [...data.contributions].sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))

  return (
    <>
      <section className="rounded-[1.75rem] bg-fund-hero p-5 text-white shadow-card">
        <div className="text-sm opacity-80">Baqi cash</div>
        <div className="text-4xl font-extrabold tracking-tight tabular-nums">{formatPKR(summary.fundLeft)}</div>
        <div className="mt-3 flex items-center gap-2.5 rounded-2xl bg-white/12 px-3 py-2.5">
          {holder && <Avatar name={holder.display_name} size={32} fund />}
          <div className="min-w-0 flex-1 text-sm">
            {holder ? (
              <>
                <span className="font-bold">{holder.display_name}</span> ke paas
              </>
            ) : (
              'Fund holder select nahi'
            )}
          </div>
          {canEdit && (
            <button onClick={() => setChangingHolder(true)} className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
              Badlein
            </button>
          )}
        </div>
        <div className="mt-4">
          <ProgressBar value={summary.fundSpent} max={summary.fundCollected} tone="bg-white" />
          <div className="mt-2 flex justify-between text-xs opacity-85">
            <span>{formatPKR(summary.fundSpent)} kharch</span>
            <span>{formatPKR(summary.fundCollected)} jama</span>
          </div>
        </div>
      </section>

      {canEdit && (
        <button onClick={() => setAdding(true)} className={`${buttonFund} mt-4 w-full py-3`}>
          <Plus size={18} /> Contribution add
        </button>
      )}

      <SectionTitle
        title="Contributions"
        right={
          <span className="rounded-full bg-fund-soft px-2.5 py-0.5 text-xs font-bold text-fund">
            {contributors.size} / {data.members.length} jama
          </span>
        }
      />
      <ul className={`${cardClass} divide-y divide-line overflow-hidden`}>
        {list.map((c) => {
          const m = view.member(c.member_id)
          return (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={m?.display_name ?? '?'} fund />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{m?.display_name ?? '?'}</div>
                <div className="text-xs text-ink-3">
                  {formatShortDate(c.date)}
                  {c.note && ` · ${c.note}`}
                </div>
              </div>
              <div className="font-bold text-fund tabular-nums">{formatPKR(c.amount)}</div>
              {canEdit && (
                <button
                  aria-label="Delete contribution"
                  onClick={() => window.confirm(`${m?.display_name} ki ${formatPKR(c.amount)} contribution delete karein?`) && deleteContribution(data.trip.id, c.id)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 active:bg-card-2"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </li>
          )
        })}
        {pending.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-4 py-3 opacity-60">
            <Avatar name={m.display_name} />
            <div className="flex-1 font-semibold">{m.display_name}</div>
            <span className="text-xs font-semibold text-warn">Abhi jama nahi</span>
          </li>
        ))}
        {list.length === 0 && pending.length === 0 && <li className="px-4 py-8 text-center text-ink-3">Koi member nahi</li>}
      </ul>

      {adding && <ContributionSheet view={view} onClose={() => setAdding(false)} />}
      {changingHolder && (
        <Modal title="Fund holder kaun hai?" onClose={() => setChangingHolder(false)}>
          <p className="mb-3 text-sm text-ink-3">Jis ke paas Group Fund ka cash hai. Baqi cash uske hisab mein minus hota hai.</p>
          <div className="space-y-2">
            {data.members.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setFundHolder(data.trip.id, m.id)
                  setChangingHolder(false)
                }}
                className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left font-semibold ${
                  m.id === holder?.id ? 'border-fund bg-fund-soft text-fund' : 'border-line'
                }`}
              >
                <Avatar name={m.display_name} size={34} fund={m.id === holder?.id} />
                {m.display_name}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  )
}

function ContributionSheet({ view, onClose }: { view: TripView; onClose: () => void }) {
  const { data } = view
  const contributors = new Set(data.contributions.map((c) => c.member_id))
  // Default: the first member who hasn't paid yet, and the most common contribution amount.
  const firstPending = data.members.find((m) => !contributors.has(m.id)) ?? data.members[0]
  const counts = new Map<number, number>()
  for (const c of data.contributions) counts.set(c.amount, (counts.get(c.amount) ?? 0) + 1)
  const usual = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0]

  const [memberId, setMemberId] = useState(firstPending?.id ?? '')
  const [amountText, setAmountText] = useState(usual ? formatNumber(usual) : '')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const amount = parseAmount(amountText)

  function save(e: FormEvent) {
    e.preventDefault()
    if (!amount || !memberId) return
    addContribution(data.trip.id, { member_id: memberId, amount, date, note: note.trim() })
    onClose()
  }

  return (
    <Modal title="Contribution add" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div>
          <div className={labelClass}>Kis ne jama karaya</div>
          <div className="flex flex-wrap gap-2">
            {data.members.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setMemberId(m.id)}
                aria-pressed={memberId === m.id}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                  memberId === m.id ? 'border-fund bg-fund-soft text-fund' : 'border-line text-ink-2'
                }`}
              >
                {m.display_name}
                {contributors.has(m.id) && ' ✓'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor="c-amount">Amount (Rs)</label>
            <input
              id="c-amount"
              inputMode="numeric"
              className={inputClass}
              value={amountText}
              onChange={(e) => {
                const v = parseAmount(e.target.value)
                setAmountText(v === null ? e.target.value.replace(/[^\d,]/g, '') : formatNumber(v))
              }}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="c-date">Date</label>
            <input id="c-date" type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="c-note">Note (optional)</label>
          <input id="c-note" className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. JazzCash se" />
        </div>
        <p className="text-xs text-ink-3">
          Cash {view.holder?.display_name ?? 'fund holder'} ke paas jayega · {formatDate(date)}
        </p>
        <button className={`${buttonFund} w-full py-3`} disabled={!amount || !memberId}>
          Save
        </button>
      </form>
    </Modal>
  )
}
