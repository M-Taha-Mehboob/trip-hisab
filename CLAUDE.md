# CLAUDE.md

Trip Hisab: PWA (live at https://trip-hisab.pages.dev, Cloudflare Pages auto-deploys `main`) for a friends' trip group (expenses, Group Fund, equal split, settle up). PKR whole rupees. See README.md for rules, data model and commands. Reference stack/style: `D:\Projects\ExpenseApp`.

## Working with the user
- Talk in Roman Urdu, the way the user writes; tech terms in plain English. They prefer answering in chat, not multiple-choice prompts.
- Before code edits, list the changes once and ask "kardun?".
- They run SQL themselves in the Supabase SQL Editor: write migrations, never run them against a database.
- Never ask for keys in chat; they edit `.env.local` themselves. Never commit `.env*.local`.
- Ask before creating a GitHub repo, pushing, or deploying.

## Domain rules
- Never call the Group Fund "Kitty".
- Split is always equal among all trip members; no per-expense split. Leftover rupees go to the first members by `sort_order`.
- Balance = contributions + paid from own pocket − share; the fund holder also subtracts unspent fund cash. Sum = 0.
- Settle up: greedy max-creditor / max-debtor; ties by bigger original balance, then `sort_order`. Paid transfers are stored (`settlements`), open ones computed.
- All maths in `src/lib/hisab.ts` (pure, no imports so `npm test` runs it in Node). Keep `tests/hisab.test.ts` passing: the mockup numbers (Ali→Hamza 10,000, Bilal→Usman 2,000, Saad→Usman 2,000, Fahad→Aap 2,000) must not change.
- Roles per trip: admin writes, member is read-only but sees everything. UI hides admin actions; RLS enforces it.
- Categories: fuel, hotel, khana, jeep, toll, other (`src/lib/categories.ts`).

## Layout
- `src/data/types.ts` row types (mirror the SQL). `src/data/db.ts` Dexie DB per login (`_dirty` = not uploaded, `_new` = never uploaded, `receipts` = photo queue/cache). `src/data/store.ts` ALL write actions (Dexie first, offline). `src/data/hooks.ts` `useTripView()` / `useTripViews()` build summary/plan/me/isAdmin from `TripsContext` (filled live in `src/auth/RequireAuth.tsx`).
- `src/sync/sync.ts`: push dirty rows (insert new, update known by id; never send `user_id`/`role` on member updates), upload/delete queued receipts, pull trips in full + each trip's child tables by per-trip keyset cursor. `SyncProvider` runs it on start/online/foreground/after edits/every minute.
- Auth: Google only (`src/auth/AuthProvider.tsx`, PKCE). Invite: `/join/:code` (`invite_preview` / `join_trip` RPCs), share sheet in `src/components/InviteSheet.tsx`.
- `src/data/mock.ts` sample trip used by the tests only (mockup numbers).
- `src/pages/*` one component per route; `src/components/TripLayout.tsx` trip header + bottom nav (Home / Kharche / Group Fund / Hisab). Routes: `/login`, `/join/:code`, `/`, `/trip/:id`, `/trip/:id/kharche`, `/fund`, `/hisab`, `/hisab/settle`, `/trip/:id/kharcha/new|:expenseId`.
- Styling: only semantic tokens from `src/index.css` (`bg-card`, `text-ink-2`, `bg-primary`, `bg-hero`, `text-hero-ink`, `bg-hero-chip`, `bg-nav`, `bg-fund`, `text-on-fund`, `ok`/`danger`...). Three themes picked by time of day (`src/theme/theme.ts`: Glacier 6:00–16:29, Sunset 16:30–19:29, Night 19:30–5:59; Settings can pin one), set as `<html data-theme>`; every token must be defined in all three. Mountain scenery per theme in `src/components/TripHero.tsx`. Shared class strings in `src/components/styles.ts`, small shared UI in `src/components/ui.tsx`. Icons: lucide-react. Font: Bricolage Grotesque (bundled).
- Money: `formatPKR` / `formatSigned` in `src/lib/format.ts`. Receipt compression: `src/lib/image.ts` (~200 KB JPEG).
- Schema changes: new numbered file in `supabase/migrations/` (never edit one the user already ran).
- Dev server port 5174 (strict; IndexedDB is per origin). Icons: `scripts/make-icons.cjs`.

## Check before finishing
`npm test`, `npm run build` (runs `tsc -b`) and `npm run lint` must pass.
