import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { cardClass } from '../components/styles'
import { ExpenseRow } from '../components/ui'
import { useTripView } from '../data/hooks'
import { formatPKR, formatShortDate } from '../lib/format'

/** All expenses, grouped by day, with a category filter. */
export default function ExpensesPage() {
  const { tripId } = useParams()
  const view = useTripView(tripId)!
  const [filter, setFilter] = useState<string>('all')
  const list = view.data.expenses
    .filter((e) => filter === 'all' || e.category === filter)
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
  const days = [...new Set(list.map((e) => e.date))]
  const shown = list.reduce((s, e) => s + e.amount, 0)

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${
      active ? 'border-primary bg-primary text-on-primary' : 'border-line bg-card text-ink-2'
    }`

  return (
    <>
      <div className="flex items-baseline justify-between px-1">
        <h1 className="text-xl font-extrabold">Kharche</h1>
        <span className="text-sm text-ink-3">
          {list.length} · <span className="font-semibold text-ink">{formatPKR(shown)}</span>
        </span>
      </div>
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        <button className={chip(filter === 'all')} onClick={() => setFilter('all')}>
          Sab
        </button>
        {view.categories.filter((c) => !c.custom || view.data.expenses.some((e) => e.category === c.id)).map((c) => (
          <button key={c.id} className={chip(filter === c.id)} onClick={() => setFilter(c.id)}>
            {c.label}
          </button>
        ))}
      </div>

      {days.length === 0 && <div className={`${cardClass} mt-4 px-4 py-8 text-center text-ink-3`}>Koi kharcha nahi</div>}
      {days.map((day) => {
        const items = list.filter((e) => e.date === day)
        return (
          <section key={day} className="mt-4">
            <div className="mb-1.5 flex justify-between px-1 text-xs font-semibold text-ink-3">
              <span>{formatShortDate(day)}</span>
              <span>{formatPKR(items.reduce((s, e) => s + e.amount, 0))}</span>
            </div>
            <ul className={`${cardClass} ticket-list divide-y divide-line overflow-hidden`}>
              {items.map((e) => (
                <li key={e.id}>
                  <ExpenseRow expense={e} info={view.category(e.category)} payer={view.member(e.paid_by_member_id)} to={`/trip/${tripId}/kharcha/${e.id}`} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {view.isAdmin && view.data.trip.status === 'active' && (
        <Link
          to={`/trip/${tripId}/kharcha/new`}
          aria-label="Kharcha add"
          className="fixed right-5 bottom-[calc(env(safe-area-inset-bottom)+6rem)] z-10 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-on-primary shadow-lg active:scale-95"
        >
          <Plus size={26} />
        </Link>
      )}
    </>
  )
}
