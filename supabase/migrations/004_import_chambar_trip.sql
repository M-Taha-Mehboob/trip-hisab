-- 004_import_chambar_trip.sql : one-time import of the old "Tandoallahyar, Chambar Trip"
-- (08-09 Nov 2026) from the Excel sheet. Run once in the SQL Editor, AFTER 003.
--
-- Owner: Taha (looked up by Google email). Fund holder: Umair Khilji. Everyone else is a placeholder
-- and links their login through the invite link. All 7 expenses were paid from the Group Fund.
-- Paid returns are NOT included: mark them Paid in the app (Hisab -> Settle up).
--
-- Triggers are switched off for this transaction only: the guards need a signed-in user (auth.uid()),
-- which the SQL Editor doesn't have. Defaults still fill created_at / updated_at.

begin;
set local session_replication_role = replica;

do $$
declare
  v_owner  uuid;
  v_trip   uuid := gen_random_uuid();
  v_ids    uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
                           gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  -- 1 Ali Patel, 2 Mansoor, 3 Salman, 4 Shoaib Mass, 5 Taha, 6 Ali Raza, 7 Shoaib Ahmed, 8 Umair
begin
  select id into v_owner from auth.users where email = 'tahamehboob07@gmail.com';
  if v_owner is null then
    raise exception 'Owner login not found: sign in to the app once first';
  end if;

  insert into public.trips (id, name, start_date, end_date, status, fund_holder_member_id, created_by)
  values (v_trip, 'Tandoallahyar, Chambar Trip', '2026-11-08', '2026-11-09', 'active', v_ids[8], v_owner);

  insert into public.trip_members (id, trip_id, user_id, display_name, role, sort_order, avatar_url) values
    (v_ids[1], v_trip, null,    'Ali Patel',      'member', 0, null),
    (v_ids[2], v_trip, null,    'Mansoor Warwani','member', 1, null),
    (v_ids[3], v_trip, null,    'Salman Imdad',   'member', 2, null),
    (v_ids[4], v_trip, null,    'Shoaib Mass',    'member', 3, null),
    (v_ids[5], v_trip, v_owner, 'Taha',           'admin',  4, (select avatar_url from public.profiles where id = v_owner)),
    (v_ids[6], v_trip, null,    'Ali Raza',       'member', 5, null),
    (v_ids[7], v_trip, null,    'Shoaib Ahmed',   'member', 6, null),
    (v_ids[8], v_trip, null,    'Umair Khilji',   'member', 7, null);

  insert into public.contributions (trip_id, member_id, amount, date, note, created_by) values
    (v_trip, v_ids[2], 5400,  '2026-11-08', '', v_owner),
    (v_trip, v_ids[3], 7785,  '2026-11-08', '', v_owner),
    (v_trip, v_ids[4], 5000,  '2026-11-08', '', v_owner),
    (v_trip, v_ids[5], 4515,  '2026-11-08', 'Ali Raza ko diye', v_owner),
    (v_trip, v_ids[6], 10065, '2026-11-08', '', v_owner),
    (v_trip, v_ids[7], 4515,  '2026-11-08', 'Salman Imdad ko diye', v_owner);

  -- paid_by_member_id null = from the Group Fund
  insert into public.expenses (trip_id, amount, category, paid_by_member_id, date, note, created_by) values
    (v_trip, 2800,  'khana', null, '2026-11-08', 'Lunch', v_owner),
    (v_trip, 1140,  'khana', null, '2026-11-09', 'Tea Biscuit', v_owner),
    (v_trip, 10970, 'fuel',  null, '2026-11-08', 'Fuel Salman Imdad car', v_owner),
    (v_trip, 6550,  'khana', null, '2026-11-08', 'Dinner', v_owner),
    (v_trip, 12200, 'fuel',  null, '2026-11-08', 'Fuel Ali Patel car', v_owner),
    (v_trip, 1230,  'toll',  null, '2026-11-08', 'Toll Ali Patel car', v_owner),
    (v_trip, 1230,  'toll',  null, '2026-11-08', 'Toll Salman Imdad car', v_owner);
end;
$$;

commit;
