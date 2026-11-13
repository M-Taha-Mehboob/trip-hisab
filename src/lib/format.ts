const pkr = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 })

/** Whole PKR: 12000 -> "Rs 12,000", -500 -> "-Rs 500". */
export function formatPKR(amount: number | null | undefined): string {
  const value = Math.round(Number(amount ?? 0))
  if (!Number.isFinite(value)) return 'Rs 0'
  const text = `Rs ${pkr.format(Math.abs(value))}`
  return value < 0 ? `-${text}` : text
}

/** Balance with an explicit sign: +Rs 2,000 / −Rs 10,000 / Rs 0. */
export function formatSigned(amount: number): string {
  if (amount === 0) return 'Rs 0'
  return `${amount > 0 ? '+' : '−'}${formatPKR(Math.abs(amount))}`
}

/** Plain number with separators: 10000 -> "10,000". */
export const formatNumber = (n: number) => pkr.format(n)

/** Parse a typed whole-rupee amount ("12,000"). Null for empty, invalid or fractional input. */
export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[,\s]/g, '')
  if (cleaned === '' || !/^\d+$/.test(cleaned)) return null
  return Number(cleaned)
}

/** Today's local date as YYYY-MM-DD. */
export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const toDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** "2026-11-05" -> "5 Nov" */
export const formatShortDate = (iso: string) => toDate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

/** "2026-11-05" -> "5 Nov 2026" */
export const formatDate = (iso: string) =>
  toDate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/** "5 – 12 Nov 2026", or "5 Nov 2026 se" while the trip has no end date. */
export function formatDateRange(start: string, end: string | null): string {
  if (!end) return `${formatDate(start)} se`
  const a = toDate(start)
  const b = toDate(end)
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) return `${a.getDate()} – ${formatDate(end)}`
  return `${formatShortDate(start)} – ${formatDate(end)}`
}

/** "Hamza Khan" -> "HK", "Ali" -> "A" */
export function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}
