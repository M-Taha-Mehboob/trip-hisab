import type { ReactNode } from 'react'
import { useTheme, type ThemeName } from '../theme/theme'

/**
 * The big card with the mountain scenery (changes with the theme). Content sits on top: put the
 * important line at the bottom in a `bg-hero-chip` box so it stays readable over the mountains.
 */
export default function TripHero({ children, className = '' }: { children: ReactNode; className?: string }) {
  const theme = useTheme()
  return (
    <section className={`relative overflow-hidden rounded-[1.75rem] bg-hero text-hero-text shadow-card ${className}`}>
      <Scenery theme={theme} className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] w-full" />
      <div className="relative">{children}</div>
    </section>
  )
}

/** Layered flat mountains per theme. Stretches to the box (preserveAspectRatio none). */
export function Scenery({ theme, className }: { theme: ThemeName; className?: string }) {
  if (theme === 'sunset') {
    return (
      <svg viewBox="0 0 400 200" preserveAspectRatio="none" className={className} aria-hidden="true">
        <circle cx="300" cy="62" r="34" fill="#ffe2b8" opacity="0.95" />
        <circle cx="300" cy="62" r="52" fill="#ffe2b8" opacity="0.18" />
        <path d="M0 120 L60 70 L110 102 L170 48 L235 100 L285 74 L340 96 L400 66 L400 200 L0 200Z" fill="#c45577" />
        <path d="M0 150 L70 108 L130 140 L200 96 L270 136 L330 112 L400 132 L400 200 L0 200Z" fill="#7a2f62" />
        <path d="M0 182 L90 152 L170 176 L250 150 L330 172 L400 158 L400 200 L0 200Z" fill="#3a1a40" />
      </svg>
    )
  }
  if (theme === 'night') {
    const stars = [
      [24, 18, 1.4], [70, 40, 1], [118, 12, 1.2], [160, 34, 0.9], [210, 16, 1.5], [252, 44, 1],
      [300, 20, 1.2], [348, 38, 1], [382, 12, 1.3], [40, 62, 0.8], [190, 58, 0.8], [330, 64, 0.9],
    ]
    return (
      <svg viewBox="0 0 400 200" preserveAspectRatio="none" className={className} aria-hidden="true">
        {stars.map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#ffffff" opacity="0.85" />
        ))}
        <path d="M0 70 Q90 30 190 62 T400 48 L400 80 Q300 70 200 92 T0 96Z" fill="#5dcaa5" opacity="0.22" />
        <path d="M0 140 L70 96 L120 124 L190 64 L260 120 L310 94 L400 128 L400 200 L0 200Z" fill="#2a3378" />
        <path d="M190 64 L208 84 L196 80 L186 90 L174 80Z" fill="#e6ebff" />
        <path d="M70 96 L82 108 L62 106Z" fill="#e6ebff" opacity="0.8" />
        <path d="M0 178 L80 146 L160 170 L240 140 L320 166 L400 150 L400 200 L0 200Z" fill="#141a42" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d="M0 128 L55 80 L100 110 L170 40 L240 104 L300 70 L400 116 L400 200 L0 200Z" fill="#8bbbe0" />
      <path d="M170 40 L192 66 L180 62 L168 74 L156 62 L148 64Z" fill="#ffffff" />
      <path d="M55 80 L68 94 L46 92Z" fill="#ffffff" />
      <path d="M300 70 L314 84 L292 84Z" fill="#ffffff" />
      <path d="M0 162 L80 118 L150 150 L230 112 L310 148 L400 128 L400 200 L0 200Z" fill="#3f7fb6" />
      <path d="M0 190 L100 166 L200 184 L300 166 L400 180 L400 200 L0 200Z" fill="#1f5c91" />
    </svg>
  )
}
