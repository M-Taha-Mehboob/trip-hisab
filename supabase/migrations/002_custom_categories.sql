-- 002_custom_categories.sql : a trip's own expense types ("Shopping", "Boating"...) on top of the
-- six built-in ones. Run once: Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- expenses.category now holds either a built-in id (fuel, hotel, khana, jeep, toll, other) or the id of
-- a row in trip_categories. Same rules as the other trip tables: members read, admins write, soft delete.

-- ---------------------------------------------------------------------------
-- trip_categories
-- ---------------------------------------------------------------------------
create table public.trip_categories (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips (id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 30),
  -- Icon key the app knows (lucide icon name); unknown keys fall back to a tag icon.
  icon        text not null default 'tag' check (length(icon) between 1 and 40),
  sort_order  int not null default 0,
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index trip_categories_sync_idx on public.trip_categories (trip_id, updated_at, id);

create trigger trip_categories_updated_at before insert or update on public.trip_categories
  for each row execute function public.set_updated_at();

alter table public.trip_categories enable row level security;

create policy "trip_categories: members read" on public.trip_categories
  for select to authenticated using (public.is_trip_member(trip_id));
create policy "trip_categories: admins add" on public.trip_categories
  for insert to authenticated with check (public.is_trip_admin(trip_id));
create policy "trip_categories: admins update" on public.trip_categories
  for update to authenticated using (public.is_trip_admin(trip_id)) with check (public.is_trip_admin(trip_id));

revoke all on public.trip_categories from anon;
grant select, insert, update on public.trip_categories to authenticated;

-- ---------------------------------------------------------------------------
-- expenses.category: built-in id or a custom category's uuid
-- ---------------------------------------------------------------------------
alter table public.expenses drop constraint if exists expenses_category_check;
alter table public.expenses add constraint expenses_category_check check (
  category in ('fuel', 'hotel', 'khana', 'jeep', 'toll', 'other')
  or category ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);

-- Let the Data API see the new table right away.
notify pgrst, 'reload schema';
