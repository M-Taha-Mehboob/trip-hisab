import { Plus } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { buttonPrimary, cardClass } from '../components/styles'
import TripHero from '../components/TripHero'
import { ExpenseRow, SectionTitle } from '../components/ui'
import { useTripView } from '../data/hooks'
import { formatPKR, formatSigned } from '../lib/format'

export default function TripDashboardPage() {
  const { tripId } = useParams()
  const view = useTripView(tripId)!
  const { summary, data, isAdmin, myRemaining } = view
  const recent = [...data.expenses].sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)).slice(0, 6)

  return (
    <>
      <TripHero className="p-5">
        <div className="text-sm">Total kharcha</div>
        <div className="text-4xl font-extrabold tracking-tight text-hero-ink tabular-nums">{formatPKR(summary.total)}</div>
        <div className="mt-1 text-sm">
          {summary.memberCount} members · {data.expenses.length} kharche
        </div>
        <div className="mt-20 grid grid-cols-3 gap-2">
          <Stat label="Per head" value={formatPKR(summary.perHead)} />
          <Stat label="Group Fund baqi" value={formatPKR(summary.fundLeft)} />
          <Stat
            label={myRemaining > 0 ? 'Aap ko milenge' : myRemaining < 0 ? 'Aap ne dene hain' : 'Aapka hisab'}
            value={formatSigned(myRemaining)}
          />
        </div>
      </TripHero>

      {isAdmin && data.trip.status === 'active' && (
        <Link to={`/trip/${tripId}/kharcha/new`} className={`${buttonPrimary} mt-4 w-full py-3`}>
          <Plus size={18} /> Kharcha add
        </Link>
      )}

      <SectionTitle
        title="Recent kharche"
        right={
          data.expenses.length > recent.length && (
            <Link to={`/trip/${tripId}/kharche`} className="text-sm font-semibold text-primary-text">
              Sab dekhein
            </Link>
          )
        }
      />
      {recent.length === 0 ? (
        <div className={`${cardClass} px-4 py-8 text-center text-ink-3`}>Abhi koi kharcha nahi</div>
      ) : (
        <ul className={`${cardClass} ticket-list divide-y divide-line overflow-hidden`}>
          {recent.map((e) => (
            <li key={e.id}>
              <ExpenseRow expense={e} payer={view.member(e.paid_by_member_id)} to={`/trip/${tripId}/kharcha/${e.id}`} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-hero-chip px-2.5 py-2.5 text-hero-chip-ink backdrop-blur-sm">
      <div className="text-[11px] leading-tight opacity-80">{label}</div>
      <div className="mt-1 text-[15px] font-bold whitespace-nowrap tabular-nums">{value}</div>
    </div>
  )
}
