// Run with `npm test` (Node's built-in test runner; Node 24 runs .ts directly).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mockTrips } from '../src/data/mock.ts'
import { settlePlan, settleUp, splitEqually, summarize } from '../src/lib/hisab.ts'

const hunza = mockTrips[0]
const name = (id: string) => hunza.members.find((m) => m.id === id)!.display_name

function summary() {
  return summarize({
    members: hunza.members,
    expenses: hunza.expenses,
    contributions: hunza.contributions,
    fundHolderMemberId: hunza.trip.fund_holder_member_id,
  })
}

test('mockup totals', () => {
  const s = summary()
  assert.equal(s.memberCount, 7)
  assert.equal(s.total, 84_000)
  assert.equal(s.perHead, 12_000)
  assert.equal(s.fundCollected, 70_000)
  assert.equal(s.fundSpent, 62_000)
  assert.equal(s.fundLeft, 8_000)
})

test('mockup balances, sum is zero', () => {
  const s = summary()
  const byName = Object.fromEntries(s.balances.map((b) => [name(b.memberId), b.balance]))
  assert.deepEqual(byName, { Aap: 2_000, Ali: -10_000, Hamza: 10_000, Usman: 4_000, Bilal: -2_000, Saad: -2_000, Fahad: -2_000 })
  assert.equal(s.balances.reduce((t, b) => t + b.balance, 0), 0)
})

test('mockup settle up: 4 transfers', () => {
  const s = summary()
  const plan = settleUp(s.balances, hunza.members).map((t) => `${name(t.fromMemberId)}->${name(t.toMemberId)} ${t.amount}`)
  assert.deepEqual(plan, ['Ali->Hamza 10000', 'Bilal->Usman 2000', 'Saad->Usman 2000', 'Fahad->Aap 2000'])
})

test('paid transfers stay, the rest is recomputed', () => {
  const s = summary()
  const paid = [{ from_member_id: 'trip-hunza-ali', to_member_id: 'trip-hunza-hamza', amount: 10_000 }]
  const { open } = settlePlan(s.balances, hunza.members, paid)
  assert.equal(open.length, 3)
  assert.ok(!open.some((t) => t.fromMemberId === 'trip-hunza-ali'))
})

test('uneven split: leftover rupees go to the first members, deterministic', () => {
  const ms = [
    { id: 'c', sort_order: 2 },
    { id: 'a', sort_order: 0 },
    { id: 'b', sort_order: 1 },
  ]
  const shares = splitEqually(1_001, ms)
  assert.deepEqual([shares.get('a'), shares.get('b'), shares.get('c')], [334, 334, 333])
})

test('uneven trip still sums to zero and settles fully', () => {
  const ms = [0, 1, 2].map((i) => ({ id: `m${i}`, sort_order: i }))
  const s = summarize({
    members: ms,
    expenses: [
      { amount: 1_000, paid_by_member_id: 'm0' },
      { amount: 2_501, paid_by_member_id: null },
    ],
    contributions: [{ member_id: 'm1', amount: 3_000 }],
    fundHolderMemberId: 'm2',
  })
  assert.equal(s.balances.reduce((t, b) => t + b.balance, 0), 0)
  const transfers = settleUp(s.balances, ms)
  const net = new Map(s.balances.map((b) => [b.memberId, b.balance]))
  for (const t of transfers) {
    net.set(t.fromMemberId, net.get(t.fromMemberId)! + t.amount)
    net.set(t.toMemberId, net.get(t.toMemberId)! - t.amount)
  }
  assert.ok([...net.values()].every((v) => v === 0))
})
