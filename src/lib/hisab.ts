// Trip maths. Pure functions, no imports, so `npm test` runs them directly in Node.
//
// Rules (agreed with the user):
// - Every expense is split equally among ALL members of the trip. Amounts are whole PKR.
// - When the total doesn't divide evenly, the leftover rupees go one each to the first members in
//   sort order (deterministic, so every phone shows the same numbers).
// - balance = contributions + paid from own pocket - equal share.
//   The fund holder also subtracts the unspent Group Fund cash they hold (that cash belongs to the group).
//   Sum of all balances = 0. Positive = "lene hain" (gets money back), negative = "dene hain".
// - Settle up = fewest transfers, greedy: biggest debtor pays biggest creditor, repeat.

export interface HisabMember {
  id: string
  sort_order: number
}

export interface HisabExpense {
  amount: number
  /** Null = paid from the Group Fund. */
  paid_by_member_id: string | null
}

export interface HisabContribution {
  member_id: string
  amount: number
}

export interface HisabSettlement {
  from_member_id: string
  to_member_id: string
  amount: number
}

export interface MemberBalance {
  memberId: string
  /** Put into the Group Fund. */
  contributed: number
  /** Paid from their own pocket ("Jeb se"). */
  paidPersonally: number
  /** Equal share of the total kharcha. */
  share: number
  /** Unspent Group Fund cash this member holds (only the fund holder, else 0). */
  fundHeld: number
  /** contributed + paidPersonally - share - fundHeld. */
  balance: number
}

export interface TripSummary {
  total: number
  memberCount: number
  /** Share of a member without a leftover rupee (total / members, rounded down). */
  perHead: number
  fundCollected: number
  fundSpent: number
  fundLeft: number
  balances: MemberBalance[]
}

export interface Transfer {
  fromMemberId: string
  toMemberId: string
  amount: number
}

const byOrder = (a: HisabMember, b: HisabMember) => a.sort_order - b.sort_order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/** Split a whole-rupee total equally; the first `total % n` members (sort order) pay 1 rupee more. */
export function splitEqually(total: number, members: HisabMember[]): Map<string, number> {
  const shares = new Map<string, number>()
  const n = members.length
  if (n === 0) return shares
  const base = Math.floor(total / n)
  let leftover = total - base * n
  for (const m of [...members].sort(byOrder)) {
    shares.set(m.id, base + (leftover > 0 ? 1 : 0))
    if (leftover > 0) leftover--
  }
  return shares
}

export function summarize(input: {
  members: HisabMember[]
  expenses: HisabExpense[]
  contributions: HisabContribution[]
  fundHolderMemberId: string | null
}): TripSummary {
  const members = [...input.members].sort(byOrder)
  const total = input.expenses.reduce((s, e) => s + e.amount, 0)
  const fundSpent = input.expenses.filter((e) => e.paid_by_member_id === null).reduce((s, e) => s + e.amount, 0)
  const fundCollected = input.contributions.reduce((s, c) => s + c.amount, 0)
  const fundLeft = fundCollected - fundSpent
  const shares = splitEqually(total, members)

  const balances = members.map((m): MemberBalance => {
    const contributed = input.contributions.filter((c) => c.member_id === m.id).reduce((s, c) => s + c.amount, 0)
    const paidPersonally = input.expenses.filter((e) => e.paid_by_member_id === m.id).reduce((s, e) => s + e.amount, 0)
    const share = shares.get(m.id) ?? 0
    const fundHeld = m.id === input.fundHolderMemberId ? fundLeft : 0
    return { memberId: m.id, contributed, paidPersonally, share, fundHeld, balance: contributed + paidPersonally - share - fundHeld }
  })

  return {
    total,
    memberCount: members.length,
    perHead: members.length ? Math.floor(total / members.length) : 0,
    fundCollected,
    fundSpent,
    fundLeft,
    balances,
  }
}

/**
 * Fewest transfers that bring every balance to 0 (greedy max-creditor / max-debtor).
 * Ties: the bigger original balance first, then sort order, so the plan is stable on every phone.
 */
export function settleUp(balances: MemberBalance[], members: HisabMember[]): Transfer[] {
  const order = new Map([...members].sort(byOrder).map((m, i) => [m.id, i]))
  const people = balances
    .filter((b) => b.balance !== 0)
    .map((b) => ({ id: b.memberId, original: Math.abs(b.balance), left: b.balance }))
  const pick = (sign: 1 | -1) => {
    let best: (typeof people)[number] | undefined
    for (const p of people) {
      if (Math.sign(p.left) !== sign) continue
      if (
        !best ||
        Math.abs(p.left) > Math.abs(best.left) ||
        (Math.abs(p.left) === Math.abs(best.left) &&
          (p.original > best.original || (p.original === best.original && order.get(p.id)! < order.get(best.id)!)))
      )
        best = p
    }
    return best
  }

  const transfers: Transfer[] = []
  for (;;) {
    const creditor = pick(1)
    const debtor = pick(-1)
    if (!creditor || !debtor) break
    const amount = Math.min(creditor.left, -debtor.left)
    transfers.push({ fromMemberId: debtor.id, toMemberId: creditor.id, amount })
    creditor.left -= amount
    debtor.left += amount
  }
  return transfers
}

/**
 * Settle-up plan once some transfers are already marked Paid: the paid ones stay as they are,
 * and the rest is recomputed from what is still owed (so a later edit to an expense still adds up).
 */
export function settlePlan<S extends HisabSettlement>(
  balances: MemberBalance[],
  members: HisabMember[],
  paid: S[],
): { paid: S[]; open: Transfer[] } {
  const left = balances.map((b) => {
    const sent = paid.filter((s) => s.from_member_id === b.memberId).reduce((s, x) => s + x.amount, 0)
    const received = paid.filter((s) => s.to_member_id === b.memberId).reduce((s, x) => s + x.amount, 0)
    return { ...b, balance: b.balance + sent - received }
  })
  return { paid, open: settleUp(left, members) }
}

/** What a member still gets (+) or owes (-) after the transfers already marked Paid. */
export function remainingBalance(balance: MemberBalance, paid: HisabSettlement[]): number {
  const sent = paid.filter((s) => s.from_member_id === balance.memberId).reduce((s, x) => s + x.amount, 0)
  const received = paid.filter((s) => s.to_member_id === balance.memberId).reduce((s, x) => s + x.amount, 0)
  return balance.balance + sent - received
}
