-- 005_owner_deletes_trip.sql : only the trip owner can delete a trip (soft delete: deleted_at).
-- Run once: SQL Editor -> paste -> Run. Undo a delete: update trips set deleted_at = null where id = '...';

create or replace function public.trips_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.created_by = old.created_by;
    if new.deleted_at is distinct from old.deleted_at and auth.uid() is distinct from old.created_by then
      raise exception 'Only the trip owner can delete the trip';
    end if;
  end if;
  if new.fund_holder_member_id is not null and not exists (
    select 1 from public.trip_members m where m.id = new.fund_holder_member_id and m.trip_id = new.id
  ) and tg_op = 'UPDATE' then
    raise exception 'Fund holder must be a member of this trip';
  end if;
  return new;
end;
$$;
