import {
  BedDouble,
  Camera,
  CarFront,
  Coffee,
  Fish,
  Fuel,
  Gift,
  Mountain,
  Package,
  ParkingCircle,
  Pill,
  Sailboat,
  Shirt,
  ShoppingBag,
  Tag,
  Tent,
  Ticket,
  TicketCheck,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { BuiltinCategory, Category, TripCategory } from '../data/types'

export interface CategoryInfo {
  id: Category
  label: string
  icon: LucideIcon
  /** Tailwind classes for the icon circle (tokens from index.css). */
  tone: string
  /** True for a trip's own type (not one of the six built-in ones). */
  custom?: boolean
}

export const CATEGORIES: (CategoryInfo & { id: BuiltinCategory })[] = [
  { id: 'fuel', label: 'Fuel', icon: Fuel, tone: 'bg-[var(--cat-fuel-soft)] text-[var(--cat-fuel)]' },
  { id: 'hotel', label: 'Hotel', icon: BedDouble, tone: 'bg-[var(--cat-hotel-soft)] text-[var(--cat-hotel)]' },
  { id: 'khana', label: 'Khana', icon: UtensilsCrossed, tone: 'bg-[var(--cat-khana-soft)] text-[var(--cat-khana)]' },
  { id: 'jeep', label: 'Jeep', icon: CarFront, tone: 'bg-[var(--cat-jeep-soft)] text-[var(--cat-jeep)]' },
  { id: 'toll', label: 'Toll', icon: Ticket, tone: 'bg-[var(--cat-toll-soft)] text-[var(--cat-toll)]' },
  { id: 'other', label: 'Other', icon: Package, tone: 'bg-[var(--cat-other-soft)] text-[var(--cat-other)]' },
]

/** Icons an admin can pick for a new type. The key is what trip_categories.icon stores. */
export const CUSTOM_ICONS: { key: string; icon: LucideIcon }[] = [
  { key: 'shopping-bag', icon: ShoppingBag },
  { key: 'ticket-check', icon: TicketCheck },
  { key: 'sailboat', icon: Sailboat },
  { key: 'camera', icon: Camera },
  { key: 'coffee', icon: Coffee },
  { key: 'gift', icon: Gift },
  { key: 'pill', icon: Pill },
  { key: 'tent', icon: Tent },
  { key: 'mountain', icon: Mountain },
  { key: 'fish', icon: Fish },
  { key: 'shirt', icon: Shirt },
  { key: 'parking', icon: ParkingCircle },
  { key: 'wrench', icon: Wrench },
  { key: 'tag', icon: Tag },
]

const CUSTOM_TONE = 'bg-accent-soft text-accent-ink'

export function customCategoryInfo(c: TripCategory): CategoryInfo {
  const icon = CUSTOM_ICONS.find((i) => i.key === c.icon)?.icon ?? Tag
  return { id: c.id, label: c.name, icon, tone: CUSTOM_TONE, custom: true }
}

/** Built-in types followed by the trip's own ones. */
export function tripCategories(custom: TripCategory[]): CategoryInfo[] {
  return [...CATEGORIES, ...custom.map(customCategoryInfo)]
}

/** Info for an expense's category; a deleted or not-yet-synced custom type shows as "Other". */
export function categoryInfo(id: Category, all: CategoryInfo[] = CATEGORIES): CategoryInfo {
  return all.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
}
