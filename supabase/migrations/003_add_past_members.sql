-- 003_add_past_members.sql : the trip owner can add people who already joined one of their earlier
-- trips straight into a new trip (no new invite link needed). Run once: SQL Editor -> paste -> Run.
--
-- Before: a member row could be linked only to the caller's own login (join_trip / the owner's own row).
-- Now also: the trip OWNER may insert a row linked to someone who shares another live trip with them.

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
    -- Owner adding a trip mate from an earlier trip (insert only).
    if not (
      tg_op = 'INSERT'
      and auth.uid() = v_owner
      and exists (
        select 1
        from public.trip_members theirs
        join public.trip_members mine
          on mine.trip_id = theirs.trip_id and mine.user_id = auth.uid() and mine.deleted_at is null
        where theirs.user_id = new.user_id and theirs.deleted_at is null and theirs.trip_id <> new.trip_id
      )
    ) then
      raise exception 'Members link their own login through the invite link';
    end if;
  end if;
  return new;
end;
$$;
