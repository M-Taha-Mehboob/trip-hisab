// Phase 1 sample data (same numbers as the approved mockup). Replaced by Supabase + Dexie in phase 3.
//
// Active trip: 7 members x Rs 10,000 contribution = 70,000 in the Group Fund. Fund spent 62,000, so Ali
// (fund holder) holds 8,000. Paid from own pocket: Hamza 12,000, Usman 6,000, Aap 4,000. Total 84,000,
// per head 12,000. Settle up: Ali->Hamza 10,000, Bilal->Usman 2,000, Saad->Usman 2,000, Fahad->Aap 2,000.

import type { Category, Contribution, Expense, TripData, TripMember } from './types'

/** The signed-in user's member row in each trip (mock). */
export const MOCK_USER_ID = 'user-aap'

const at = '2026-11-01T09:00:00Z'

function members(tripId: string, names: string[], admins: string[]): TripMember[] {
  return names.map((name, i) => ({
    id: `${tripId}-${name.toLowerCase()}`,
    trip_id: tripId,
    user_id: name === 'Aap' ? MOCK_USER_ID : i % 3 === 2 ? null : `user-${name.toLowerCase()}`,
    display_name: name,
    role: admins.includes(name) ? 'admin' : 'member',
    sort_order: i,
    avatar_url: null,
  }))
}

let seq = 0
function expense(
  tripId: string,
  amount: number,
  category: Category,
  paidBy: string | null,
  date: string,
  note: string,
  receipt = false,
): Expense {
  return {
    id: `${tripId}-e${++seq}`,
    trip_id: tripId,
    amount,
    category,
    paid_by_member_id: paidBy ? `${tripId}-${paidBy.toLowerCase()}` : null,
    date,
    note,
    receipt_path: receipt ? 'mock' : null,
    created_at: `${date}T12:00:00Z`,
  }
}

function contributions(tripId: string, ms: TripMember[], amount: number, date: string): Contribution[] {
  return ms.map((m) => ({
    id: `${tripId}-c-${m.id}`,
    trip_id: tripId,
    member_id: m.id,
    amount,
    date,
    note: '',
    created_at: `${date}T08:00:00Z`,
  }))
}

// ---- Active trip ----
const hunza = 'trip-hunza'
const hunzaMembers = members(hunza, ['Aap', 'Ali', 'Hamza', 'Usman', 'Bilal', 'Saad', 'Fahad'], ['Aap', 'Ali'])

const hunzaTrip: TripData = {
  trip: {
    id: hunza,
    name: 'Hunza Skardu 2026',
    start_date: '2026-11-05',
    end_date: null,
    status: 'active',
    invite_code: 'hnz7k2',
    fund_holder_member_id: `${hunza}-ali`,
    created_at: at,
  },
  members: hunzaMembers,
  categories: [],
  contributions: contributions(hunza, hunzaMembers, 10_000, '2026-11-04'),
  expenses: [
    // Group Fund: 62,000
    expense(hunza, 12_000, 'fuel', null, '2026-11-05', 'Fuel Islamabad se Chilas', true),
    expense(hunza, 1_500, 'toll', null, '2026-11-05', 'Motorway + Babusar toll'),
    expense(hunza, 6_500, 'khana', null, '2026-11-05', 'Dinner Chilas'),
    expense(hunza, 28_000, 'hotel', null, '2026-11-06', 'Hotel Karimabad 2 raatein', true),
    expense(hunza, 4_000, 'khana', null, '2026-11-07', 'Lunch Passu'),
    expense(hunza, 10_000, 'jeep', null, '2026-11-09', 'Jeep Deosai', true),
    // Jeb se: 22,000
    expense(hunza, 12_000, 'hotel', 'Hamza', '2026-11-08', 'Hotel Skardu', true),
    expense(hunza, 6_000, 'fuel', 'Usman', '2026-11-10', 'Fuel Skardu'),
    expense(hunza, 4_000, 'khana', 'Aap', '2026-11-11', 'BBQ Shangrila'),
  ],
  settlements: [],
}

// ---- Past trips (settled) ----
const naran = 'trip-naran'
const naranMembers = members(naran, ['Aap', 'Ali', 'Hamza', 'Usman', 'Bilal', 'Saad'], ['Aap'])
const naranTrip: TripData = {
  trip: {
    id: naran,
    name: 'Naran Kaghan 2025',
    start_date: '2025-07-12',
    end_date: '2025-07-16',
    status: 'settled',
    invite_code: 'nrn4q8',
    fund_holder_member_id: `${naran}-aap`,
    created_at: '2025-07-10T09:00:00Z',
  },
  members: naranMembers,
  categories: [],
  contributions: contributions(naran, naranMembers, 8_000, '2025-07-11'),
  expenses: [
    expense(naran, 9_000, 'fuel', null, '2025-07-12', 'Fuel'),
    expense(naran, 18_000, 'hotel', null, '2025-07-12', 'Hotel Naran'),
    expense(naran, 7_500, 'jeep', null, '2025-07-14', 'Jeep Saif ul Malook'),
    expense(naran, 6_000, 'khana', 'Ali', '2025-07-15', 'Trout dinner'),
  ],
  settlements: [],
}

const murree = 'trip-murree'
const murreeMembers = members(murree, ['Aap', 'Hamza', 'Usman', 'Fahad', 'Bilal'], ['Aap'])
const murreeTrip: TripData = {
  trip: {
    id: murree,
    name: 'Murree Nathia Gali 2024',
    start_date: '2024-12-27',
    end_date: '2024-12-29',
    status: 'settled',
    invite_code: 'mur9x1',
    fund_holder_member_id: `${murree}-hamza`,
    created_at: '2024-12-25T09:00:00Z',
  },
  members: murreeMembers,
  categories: [],
  contributions: contributions(murree, murreeMembers, 5_000, '2024-12-26'),
  expenses: [
    expense(murree, 4_000, 'fuel', null, '2024-12-27', 'Fuel'),
    expense(murree, 14_000, 'hotel', null, '2024-12-27', 'Hotel Nathia Gali'),
    expense(murree, 3_200, 'khana', 'Fahad', '2024-12-28', 'Chai pakore'),
  ],
  settlements: [],
}

export const mockTrips: TripData[] = [hunzaTrip, naranTrip, murreeTrip]
