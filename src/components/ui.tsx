import { AlertTriangle, Check, CloudOff, CloudUpload, Crown, Image as ImageIcon, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Expense, TripMember } from '../data/types'
import type { CategoryInfo } from '../lib/categories'
import { useSync } from '../sync/context'
import { formatPKR, formatShortDate, formatSigned, initials } from '../lib/format'

/** Round initials badge (Google photo later). `fund` = purple, for the Group Fund holder. */
export function Avatar({ name, size = 40, fund = false }: { name: string; size?: number; fund?: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={`grid shrink-0 place-items-center rounded-full font-bold ${
        fund ? 'bg-fund-soft text-fund' : 'bg-primary-soft text-primary-text'
      }`}
    >
      {initials(name)}
    </span>
  )
}

/** Sync status pill: Offline · 3 / Syncing / 2 baqi / Synced. Tap to sync now (or see the error). */
export function SyncPill() {
  const { online, syncing, error, pending, syncNow } = useSync()
  let label: string
  let tone: string
  let icon: ReactNode
  if (!online) {
    label = pending ? `Offline · ${pending}` : 'Offline'
    tone = 'bg-card-2 text-ink-2'
    icon = <CloudOff size={14} />
  } else if (syncing) {
    label = 'Syncing'
    tone = 'bg-primary-soft text-primary-text'
    icon = <RefreshCw size={14} className="animate-spin" />
  } else if (error) {
    label = 'Sync error'
    tone = 'bg-danger-soft text-danger'
    icon = <AlertTriangle size={14} />
  } else if (pending) {
    label = `${pending} baqi`
    tone = 'bg-warn-soft text-warn'
    icon = <CloudUpload size={14} />
  } else {
    label = 'Synced'
    tone = 'bg-ok-soft text-ok'
    icon = <Check size={14} />
  }

  function onClick() {
    if (error) window.alert(`Sync nahi hua:\n${error}\n\nAapka data is phone par mehfooz hai. Dobara koshish ho rahi hai.`)
    void syncNow()
  }

  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${tone}`}>
      {icon}
      {label}
    </button>
  )
}

/** Centered grey text filling the screen (loading / not found). */
export function FullScreenMessage({ children }: { children: ReactNode }) {
  return <div className="flex min-h-full flex-col items-center justify-center gap-3 p-6 text-center text-ink-3">{children}</div>
}

export function CategoryIcon({ info, size = 42 }: { info: CategoryInfo; size?: number }) {
  const { icon: Icon, tone } = info
  return (
    <span style={{ width: size, height: size }} className={`grid shrink-0 place-items-center rounded-full ${tone}`}>
      <Icon size={size * 0.48} strokeWidth={2} />
    </span>
  )
}

export function FundPill({ label = 'Group Fund' }: { label?: string }) {
  return <span className="rounded-full bg-fund-soft px-2 py-0.5 text-[11px] font-semibold text-fund">{label}</span>
}

export function HolderBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-fund-soft px-2 py-0.5 text-[11px] font-semibold text-fund">
      <Crown size={11} /> Fund holder
    </span>
  )
}

/** +Rs 2,000 (green, lene hain) / −Rs 10,000 (red, dene hain). Sign is always in the text, not colour alone. */
export function BalancePill({ amount }: { amount: number }) {
  const tone = amount > 0 ? 'bg-ok-soft text-ok' : amount < 0 ? 'bg-danger-soft text-danger' : 'bg-card-2 text-ink-2'
  return <span className={`rounded-full px-2.5 py-1 text-sm font-bold whitespace-nowrap tabular-nums ${tone}`}>{formatSigned(amount)}</span>
}

export function ExpenseRow({
  expense,
  info,
  payer,
  to,
}: {
  expense: Expense
  info: CategoryInfo
  payer: TripMember | undefined
  to: string
}) {
  const { label } = info
  return (
    <Link to={to} className="flex items-center gap-3 px-4 py-3 active:bg-card-2">
      <CategoryIcon info={info} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{expense.note || label}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-3">
          {expense.paid_by_member_id ? (
            <span className="font-medium text-ink-2">{payer?.display_name ?? '?'}</span>
          ) : (
            <FundPill />
          )}
          <span>·</span>
          <span>{formatShortDate(expense.date)}</span>
          {expense.receipt_path && <ImageIcon size={13} className="text-ink-3" aria-label="Receipt photo" />}
        </div>
      </div>
      <div className="font-bold tabular-nums">{formatPKR(expense.amount)}</div>
    </Link>
  )
}

export function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="mt-6 mb-2 flex items-center justify-between px-1">
      <h2 className="text-sm font-bold tracking-wide text-ink-2 uppercase">{title}</h2>
      {right}
    </div>
  )
}

export function ProgressBar({ value, max, tone = 'bg-primary' }: { value: number; max: number; tone?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-2 overflow-hidden rounded-full bg-black/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}
