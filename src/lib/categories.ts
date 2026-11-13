import { BedDouble, CarFront, Fuel, Package, Ticket, UtensilsCrossed, type LucideIcon } from 'lucide-react'
import type { Category } from '../data/types'

export interface CategoryInfo {
  id: Category
  label: string
  icon: LucideIcon
  /** Tailwind classes for the icon circle (tokens from index.css). */
  tone: string
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'fuel', label: 'Fuel', icon: Fuel, tone: 'bg-[var(--cat-fuel-soft)] text-[var(--cat-fuel)]' },
  { id: 'hotel', label: 'Hotel', icon: BedDouble, tone: 'bg-[var(--cat-hotel-soft)] text-[var(--cat-hotel)]' },
  { id: 'khana', label: 'Khana', icon: UtensilsCrossed, tone: 'bg-[var(--cat-khana-soft)] text-[var(--cat-khana)]' },
  { id: 'jeep', label: 'Jeep', icon: CarFront, tone: 'bg-[var(--cat-jeep-soft)] text-[var(--cat-jeep)]' },
  { id: 'toll', label: 'Toll', icon: Ticket, tone: 'bg-[var(--cat-toll-soft)] text-[var(--cat-toll)]' },
  { id: 'other', label: 'Other', icon: Package, tone: 'bg-[var(--cat-other-soft)] text-[var(--cat-other)]' },
]

export const categoryInfo = (id: Category) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
