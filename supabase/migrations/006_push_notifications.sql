-- 006_push_notifications.sql : phone notifications "Aap ek naye trip mein add ho gaye: <trip>. Enjoy!"
-- Run once: SQL Editor -> paste -> Run. Setup steps (keys, secrets, deploying the function): README.md.
--
-- Flow: the app saves each phone's Web Push subscription (save_push_subscription). When the owner adds
-- someone who already has a login to a trip (a trip_members insert with user_id set), a trigger calls
-- the Edge Function notify-new-trip through pg_net; the function sends the push to that person's phones.
-- The trigger reads two Vault secrets: project_url and push_hook_secret (see README).

create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- push_subscriptions: one row per phone/browser (endpoint is unique)
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  endpoint    text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: read own" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());

revoke all on public.push_subscriptions from anon, authenticated;
grant select on public.push_subscriptions to authenticated;

-- Saves this phone for the caller. A phone that was someone else's (shared phone, other login) moves
-- to the caller, so writes go through these functions instead of plain insert/update.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, updated_at = now();
end;
$$;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;

revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
revoke execute on function public.delete_push_subscription(text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;
grant execute on function public.delete_push_subscription(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Trigger: someone with a login added to a trip by another person -> notify-new-trip
-- (Joining yourself through the invite link is an update, and adding yourself is skipped.)
-- ---------------------------------------------------------------------------
create or replace function public.notify_member_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
begin
  if new.user_id is null or new.deleted_at is not null or new.user_id = auth.uid() then
    return new;
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_hook_secret';
  if v_url is null or v_secret is null then
    return new; -- not set up yet: no notification, but never block adding the member
  end if;

  perform net.http_post(
    url := v_url || '/functions/v1/notify-new-trip',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-hook-secret', v_secret),
    body := jsonb_build_object('trip_id', new.trip_id, 'user_id', new.user_id)
  );
  return new;
exception when others then
  return new; -- a notification problem must never stop the sync
end;
$$;

create trigger trip_members_notify_added
  after insert on public.trip_members
  for each row execute function public.notify_member_added();

notify pgrst, 'reload schema';
