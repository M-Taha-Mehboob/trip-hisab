-- 001_init.sql : Trip Hisab schema, Row Level Security and receipt storage
-- Run once in a NEW Supabase project: Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Conventions (all trip tables):
--   id          uuid, generated on the phone (offline-first); server default only as a fallback
--   created_at / updated_at   updated_at is set by trigger on every insert/update (server clock), used
--                             for incremental sync pulls: "where updated_at > last_pulled"
--   deleted_at  soft delete, so deletions also reach the other phones
--   amounts     whole PKR (integer)
--
-- Access rule: you see a trip (and everything in it) if you are a member of it; you change it only if
-- you are an admin of it. The owner (trips.created_by) is always admin and is the only one who can make
-- or remove other admins. People join with the invite code through join_trip() (bottom of this file).
-- Balances and settle-up transfers are computed in the app, never stored.

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one per Google login (name + photo from Google)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null default '',
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Create the profile when someone signs in with Google for the first time.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- trips
-- ---------------------------------------------------------------------------
create table public.trips (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null check (length(trim(name)) > 0),
  start_date             date not null default current_date,
  end_date               date,
  status                 text not null default 'active' check (status in ('active', 'settled')),
  -- Code in the WhatsApp invite link: https://<app>/join/<invite_code>
  invite_code            text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)
                           check (length(invite_code) >= 6),
  -- The member who keeps the Group Fund cash. No FK on purpose (trips and trip_members reference each
  -- other, and the phone syncs them one table at a time); a trigger below checks it is a member of this trip.
  fund_holder_member_id  uuid,
  created_by             uuid not null default auth.uid() references auth.users (id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz
);

-- ---------------------------------------------------------------------------
-- trip_members: who is in a trip. user_id is null for a placeholder ("Saad" who hasn't logged in yet);
-- it gets linked when that person opens the invite link and picks their name.
-- sort_order is fixed: it also decides who gets the leftover rupees of an uneven split.
-- ---------------------------------------------------------------------------
create table public.trip_members (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references public.trips (id) on delete cascade,
  user_id       uuid references auth.users (id) on delete set null,
  display_name  text not null check (length(trim(display_name)) > 0),
  role          text not null default 'member' check (role in ('admin', 'member')),
  sort_order    int not null default 0,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  -- Target for the composite FKs below (a member referenced by an expense must be in the same trip).
  unique (trip_id, id)
);

-- One login = one member row per trip.
create unique index trip_members_trip_user_key
  on public.trip_members (trip_id, user_id)
  where user_id is not null and deleted_at is null;

-- ---------------------------------------------------------------------------
-- expenses: paid_by_member_id null = paid from the Group Fund, else paid from that member's pocket.
-- Always split equally among all members of the trip (no per-expense split).
-- receipt_path: object path in the private "receipts" bucket: <trip_id>/<expense_id>.jpg
-- ---------------------------------------------------------------------------
create table public.expenses (
  id                 uuid primary key default gen_random_uuid(),
  trip_id            uuid not null references public.trips (id) on delete cascade,
  amount             int not null check (amount > 0),
  category           text not null check (category in ('fuel', 'hotel', 'khana', 'jeep', 'toll', 'other')),
  paid_by_member_id  uuid,
  date               date not null default current_date,
  note               text not null default '',
  receipt_path       text,
  created_by         uuid default auth.uid() references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,
  foreign key (trip_id, paid_by_member_id) references public.trip_members (trip_id, id)
);

-- ---------------------------------------------------------------------------
-- contributions: money a member put into the Group Fund
-- ---------------------------------------------------------------------------
create table public.contributions (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips (id) on delete cascade,
  member_id   uuid not null,
  amount      int not null check (amount > 0),
  date        date not null default current_date,
  note        text not null default '',
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  foreign key (trip_id, member_id) references public.trip_members (trip_id, id)
);

-- ---------------------------------------------------------------------------
-- settlements: settle-up transfers marked Paid ("Ali -> Hamza Rs 10,000"). Unpaid ones are computed.
-- Un-ticking Paid soft-deletes the row.
-- ---------------------------------------------------------------------------
create table public.settlements (
  id              uuid primary key default gen_random_uuid(),
  trip_id         uuid not null references public.trips (id) on delete cascade,
  from_member_id  uuid not null,
  to_member_id    uuid not null,
  amount          int not null check (amount > 0),
  paid_at         timestamptz not null default now(),
  created_by      uuid default auth.uid() references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  check (from_member_id <> to_member_id),
  foreign key (trip_id, from_member_id) references public.trip_members (trip_id, id),
  foreign key (trip_id, to_member_id) references public.trip_members (trip_id, id)
);

-- ---------------------------------------------------------------------------
-- Indexes (sync pulls: per trip, by updated_at)
-- ---------------------------------------------------------------------------
create index trip_members_user_idx on public.trip_members (user_id) where user_id is not null;
create index trip_members_sync_idx on public.trip_members (trip_id, updated_at, id);
create index expenses_sync_idx on public.expenses (trip_id, updated_at, id);
create index contributions_sync_idx on public.contributions (trip_id, updated_at, id);
create index settlements_sync_idx on public.settlements (trip_id, updated_at, id);
create index trips_sync_idx on public.trips (updated_at, id);

-- ---------------------------------------------------------------------------
-- updated_at triggers (insert AND update, so a pull never misses a row because of a phone's clock)
-- ---------------------------------------------------------------------------
create trigger profiles_updated_at before insert or update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trips_updated_at before insert or update on public.trips
  for each row execute function public.set_updated_at();
create trigger trip_members_updated_at before insert or update on public.trip_members
  for each row execute function public.set_updated_at();
create trigger expenses_updated_at before insert or update on public.expenses
  for each row execute function public.set_updated_at();
create trigger contributions_updated_at before insert or update on public.contributions
  for each row execute function public.set_updated_at();
create trigger settlements_updated_at before insert or update on public.settlements
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Access helpers. security definer so policies can look at trip_members without recursing into
-- trip_members' own policies.
-- ---------------------------------------------------------------------------
create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trip_members m
    where m.trip_id = p_trip_id and m.user_id = auth.uid() and m.deleted_at is null
  );
$$;

create or replace function public.is_trip_admin(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trip_members m
    where m.trip_id = p_trip_id and m.user_id = auth.uid() and m.role = 'admin' and m.deleted_at is null
  )
  or exists (
    select 1 from public.trips t where t.id = p_trip_id and t.created_by = auth.uid()
  );
$$;

-- Storage paths are text ("<trip_id>/<expense_id>.jpg"); a bad folder name must not throw.
create or replace function public.safe_uuid(p text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Guard triggers
-- ---------------------------------------------------------------------------

-- trips: created_by never changes; the fund holder must be a member of this trip.
create or replace function public.trips_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.created_by = old.created_by;
  end if;
  if new.fund_holder_member_id is not null and not exists (
    select 1 from public.trip_members m where m.id = new.fund_holder_member_id and m.trip_id = new.id
  ) and tg_op = 'UPDATE' then
    raise exception 'Fund holder must be a member of this trip';
  end if;
  return new;
end;
$$;

create trigger trips_guard before insert or update on public.trips
  for each row execute function public.trips_guard();

-- trip_members:
--  * only the owner makes / removes admins, and the owner's own row stays admin
--  * nobody links a member row to someone else's login: a person links only themselves (join_trip,
--    or the owner adding their own row when creating the trip)
create or replace function public.trip_members_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  select created_by into v_owner from public.trips where id = new.trip_id;

  if tg_op = 'UPDATE' then
    new.trip_id = old.trip_id;
    if new.role <> old.role and auth.uid() is distinct from v_owner then
      raise exception 'Only the trip owner can change admins';
    end if;
  elsif new.role = 'admin' and auth.uid() is distinct from v_owner then
    raise exception 'Only the trip owner can add admins';
  end if;

  if new.user_id is not null and new.user_id = v_owner and (new.role <> 'admin' or new.deleted_at is not null) then
    raise exception 'The trip owner stays an admin';
  end if;

  if new.user_id is not null
     and (tg_op = 'INSERT' or new.user_id is distinct from old.user_id)
     and new.user_id is distinct from auth.uid() then
    raise exception 'Members link their own login through the invite link';
  end if;
  return new;
end;
$$;

create trigger trip_members_guard before insert or update on public.trip_members
  for each row execute function public.trip_members_guard();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- No delete policies: deletes are soft (update deleted_at), so they sync.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.expenses enable row level security;
alter table public.contributions enable row level security;
alter table public.settlements enable row level security;

-- profiles: your own, plus everyone you share a trip with (names / photos in the member list)
create policy "profiles: read self and trip mates" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.trip_members other
      where other.user_id = profiles.id and other.deleted_at is null and public.is_trip_member(other.trip_id)
    )
  );
create policy "profiles: update self" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- trips: any signed-in user can create one (they become its owner)
create policy "trips: members read" on public.trips
  for select to authenticated
  using (public.is_trip_member(id) or created_by = auth.uid());
create policy "trips: anyone creates own" on public.trips
  for insert to authenticated
  with check (created_by = auth.uid());
create policy "trips: admins update" on public.trips
  for update to authenticated
  using (public.is_trip_admin(id)) with check (public.is_trip_admin(id));

-- trip_members
create policy "trip_members: members read" on public.trip_members
  for select to authenticated
  using (public.is_trip_member(trip_id) or public.is_trip_admin(trip_id));
create policy "trip_members: admins add" on public.trip_members
  for insert to authenticated
  with check (public.is_trip_admin(trip_id));
create policy "trip_members: admins update" on public.trip_members
  for update to authenticated
  using (public.is_trip_admin(trip_id)) with check (public.is_trip_admin(trip_id));

-- expenses / contributions / settlements: members read, admins write
create policy "expenses: members read" on public.expenses
  for select to authenticated using (public.is_trip_member(trip_id));
create policy "expenses: admins add" on public.expenses
  for insert to authenticated with check (public.is_trip_admin(trip_id));
create policy "expenses: admins update" on public.expenses
  for update to authenticated using (public.is_trip_admin(trip_id)) with check (public.is_trip_admin(trip_id));

create policy "contributions: members read" on public.contributions
  for select to authenticated using (public.is_trip_member(trip_id));
create policy "contributions: admins add" on public.contributions
  for insert to authenticated with check (public.is_trip_admin(trip_id));
create policy "contributions: admins update" on public.contributions
  for update to authenticated using (public.is_trip_admin(trip_id)) with check (public.is_trip_admin(trip_id));

create policy "settlements: members read" on public.settlements
  for select to authenticated using (public.is_trip_member(trip_id));
create policy "settlements: admins add" on public.settlements
  for insert to authenticated with check (public.is_trip_admin(trip_id));
create policy "settlements: admins update" on public.settlements
  for update to authenticated using (public.is_trip_admin(trip_id)) with check (public.is_trip_admin(trip_id));

-- Table privileges: signed-in users only (RLS above decides the rows). Nothing for anon.
revoke all on public.profiles, public.trips, public.trip_members, public.expenses, public.contributions, public.settlements from anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.trips, public.trip_members, public.expenses, public.contributions, public.settlements to authenticated;

-- ---------------------------------------------------------------------------
-- Invite link: /join/<code>
-- invite_preview(code): trip name + names not yet claimed, so the person can pick "Main Saad hoon".
-- join_trip(code, member_id): links that placeholder to the caller's login, or adds a new member row
-- (name from their Google profile). Returns the trip id. Safe to call twice.
-- ---------------------------------------------------------------------------
create or replace function public.invite_preview(p_code text)
returns table (trip_id uuid, trip_name text, member_id uuid, display_name text, already_member boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.name, m.id, m.display_name, public.is_trip_member(t.id)
  from public.trips t
  left join public.trip_members m
    on m.trip_id = t.id and m.user_id is null and m.deleted_at is null
  where t.invite_code = p_code and t.deleted_at is null
  order by m.sort_order;
$$;

create or replace function public.join_trip(p_code text, p_member_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_trip uuid;
  v_profile public.profiles%rowtype;
begin
  if v_uid is null then
    raise exception 'Sign in first';
  end if;

  select id into v_trip from public.trips where invite_code = p_code and deleted_at is null;
  if v_trip is null then
    raise exception 'Invite link galat ya purana hai';
  end if;

  if public.is_trip_member(v_trip) then
    return v_trip;
  end if;

  select * into v_profile from public.profiles where id = v_uid;

  if p_member_id is not null then
    update public.trip_members
       set user_id = v_uid,
           avatar_url = coalesce(v_profile.avatar_url, avatar_url)
     where id = p_member_id and trip_id = v_trip and user_id is null and deleted_at is null;
    if not found then
      raise exception 'Ye naam pehle hi kisi ne le liya hai';
    end if;
  else
    insert into public.trip_members (trip_id, user_id, display_name, role, sort_order, avatar_url)
    values (
      v_trip,
      v_uid,
      coalesce(nullif(trim(v_profile.display_name), ''), 'Member'),
      'member',
      coalesce((select max(sort_order) + 1 from public.trip_members where trip_id = v_trip), 0),
      v_profile.avatar_url
    );
  end if;

  return v_trip;
end;
$$;

revoke execute on function public.invite_preview(text) from public, anon;
revoke execute on function public.join_trip(text, uuid) from public, anon;
grant execute on function public.invite_preview(text) to authenticated;
grant execute on function public.join_trip(text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Receipt photos: private bucket "receipts", path <trip_id>/<expense_id>.jpg (compressed on the phone
-- to ~200 KB). Members of that trip can view; admins upload / replace / delete.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "receipts: members read" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and public.is_trip_member(public.safe_uuid((storage.foldername(name))[1])));

create policy "receipts: admins upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and public.is_trip_admin(public.safe_uuid((storage.foldername(name))[1])));

create policy "receipts: admins replace" on storage.objects
  for update to authenticated
  using (bucket_id = 'receipts' and public.is_trip_admin(public.safe_uuid((storage.foldername(name))[1])))
  with check (bucket_id = 'receipts' and public.is_trip_admin(public.safe_uuid((storage.foldername(name))[1])));

create policy "receipts: admins delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and public.is_trip_admin(public.safe_uuid((storage.foldername(name))[1])));
