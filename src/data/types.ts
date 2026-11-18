// Row types. They mirror the Supabase tables in supabase/migrations/001_init.sql.
// Amounts are whole PKR (integers). Dates are local "YYYY-MM-DD".

export type Role = 'admin' | 'member'

export type BuiltinCategory = 'fuel' | 'hotel' | 'khana' | 'jeep' | 'toll' | 'other'

/** A built-in category id, or the id of one of the trip's own categories (TripCategory). */
export type Category = string

export type TripStatus = 'active' | 'settled'

export interface Trip {
  id: string
  name: string
  start_date: string
  end_date: string | null
  status: TripStatus
  /** Random code in the WhatsApp invite link (/join/<code>). */
  invite_code: string
  /** The member who keeps the Group Fund cash. */
  fund_holder_member_id: string | null
  created_at: string
}

export interface TripMember {
  id: string
  trip_id: string
  /** Null until this person logs in through the invite link (placeholder member). */
  user_id: string | null
  display_name: string
  role: Role
  /** Fixed order: also decides who gets the leftover rupees of an uneven split. */
  sort_order: number
  avatar_url: string | null
}

export interface Expense {
  id: string
  trip_id: string
  amount: number
  category: Category
  /** Null = paid from the Group Fund, else the member who paid from their own pocket ("Jeb se"). */
  paid_by_member_id: string | null
  date: string
  note: string
  /** Path in the private "receipts" bucket (mock: a data URL), or null. */
  receipt_path: string | null
  created_at: string
}

export interface Contribution {
  id: string
  trip_id: string
  member_id: string
  amount: number
  date: string
  note: string
  created_at: string
}

/** A settle-up transfer marked Paid. Unpaid transfers are computed, never stored. */
export interface Settlement {
  id: string
  trip_id: string
  from_member_id: string
  to_member_id: string
  amount: number
  paid_at: string
}

/** An expense type the trip's admin added ("Shopping", "Boating"...). */
export interface TripCategory {
  id: string
  trip_id: string
  name: string
  /** Icon key, see CUSTOM_ICONS in src/lib/categories.ts. */
  icon: string
  sort_order: number
  created_at: string
}

export interface TripData {
  trip: Trip
  members: TripMember[]
  /** The trip's own expense types (not the six built-in ones). */
  categories: TripCategory[]
  expenses: Expense[]
  contributions: Contribution[]
  settlements: Settlement[]
}
