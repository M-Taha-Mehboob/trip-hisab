# Trip Hisab

PWA for a group of friends on a trip: record expenses, keep an upfront **Group Fund**, split everything equally, and let every member see their own balance and the settle-up plan. Whole PKR only. Works offline (northern areas have no signal).

## Stack

- React 19 + Vite + TypeScript, Tailwind CSS v4, React Router
- vite-plugin-pwa (manifest + auto-updating service worker)
- Supabase (Postgres + Google Auth + RLS + private Storage for receipts)
- Dexie (IndexedDB) offline cache + outbox *(phase 3)*
- Hosting: Cloudflare Pages *(phase 3)*

## Money rules

- Every expense is paid either **from the Group Fund** or **from a member's own pocket** ("Jeb se").
- Split is always equal among all members of the trip. If the total doesn't divide evenly, the leftover rupees go one each to the first members (by member order), so every phone shows the same numbers.
- **Balance** = contributions + paid from own pocket − equal share. The **fund holder** also subtracts the unspent Group Fund cash they hold. All balances add up to 0.
- **Settle up** = fewest transfers (greedy: biggest debtor pays biggest creditor). Transfers marked *Paid* are stored; the rest is recomputed, so a later edit still adds up. Leftover fund is returned through settle up; nothing carries over to the next trip.
- Logic: [src/lib/hisab.ts](src/lib/hisab.ts) (pure functions), tests in [tests/hisab.test.ts](tests/hisab.test.ts) reproduce the mockup numbers.

## Data model

Schema, RLS, invite functions and storage policies: [supabase/migrations/001_init.sql](supabase/migrations/001_init.sql)

| Table | Purpose |
|---|---|
| `profiles` | One per Google login (name, photo) |
| `trips` | `name`, dates, `status` (active / settled), `invite_code`, `fund_holder_member_id`, `created_by` (owner) |
| `trip_members` | `display_name`, `role` (admin / member), `sort_order`, `user_id` (null = placeholder until they join) |
| `expenses` | `amount`, `category`, `paid_by_member_id` (null = Group Fund), `date`, `note`, `receipt_path` |
| `contributions` | Money a member put into the Group Fund |
| `settlements` | Settle-up transfers marked Paid |

Members see everything in their trips; only admins write. The owner is always admin and the only one who makes other admins. Invite: `invite_preview(code)` + `join_trip(code, member_id)`.

## Setup

1. `npm install`
2. Supabase + Google login: follow [docs/supabase-google-setup.md](docs/supabase-google-setup.md)
3. Copy `.env.example` to `.env.local` and fill in the two keys (never the service_role key).

## Commands

```bash
npm run dev       # dev server at http://localhost:5174
npm test          # hisab logic tests (Node's test runner)
npm run build     # type-check + production build to dist/
npm run lint      # oxlint
npm run preview   # serve dist/ (test the service worker / install here)
```

## Roadmap

1. Scaffold, theme, all 6 screens on mock data, hisab logic + tests *(done)*
2. Supabase schema / RLS / storage SQL + Google OAuth guide *(done, user runs it)*
3. Google login, real data via Dexie + outbox sync, offline indicator, invite link, receipt upload, Cloudflare Pages deploy
