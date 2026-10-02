-- Connections (see prd discussion): lets two users mutually opt in to being
-- "connected", as the foundation for later 1-1 chat / shared reminders.
-- Deliberately NOT a social graph: no followers, no public posts, no feed.
--
-- Every statement in this file is written to be safe to run more than once
-- (idempotent) — re-running it after a partial or full success is a no-op,
-- never an error.

-- ------------------------------------------------------------------ --
-- username on profiles                                                --
-- ------------------------------------------------------------------ --

alter table public.profiles add column if not exists username text;

-- Case-insensitive uniqueness without a separate "normalized" column — 
-- lower(username) must be unique, but the original casing the user typed
-- is preserved for display.
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (
    username is null
    or username ~ '^[a-z0-9_]{3,20}$'
  );

-- ------------------------------------------------------------------ --
-- connections                                                         --
-- ------------------------------------------------------------------ --

create table if not exists public.connections (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id  uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint connections_no_self check (requester_id <> receiver_id)
);

-- A <-> B is one relationship regardless of who sent the request — this
-- expression index treats (A,B) and (B,A) as the same pair and blocks a
-- second row for it outright, at the database level (not just in the UI).
create unique index if not exists connections_unique_pair_idx
  on public.connections (least(requester_id, receiver_id), greatest(requester_id, receiver_id));

create index if not exists connections_requester_idx on public.connections (requester_id);
create index if not exists connections_receiver_idx on public.connections (receiver_id);

drop trigger if exists connections_set_updated_at on public.connections;
create trigger connections_set_updated_at
  before update on public.connections
  for each row execute function public.bump_updated_at();

-- ------------------------------------------------------------------ --
-- Public profile view — OTHER users' public-safe fields                --
-- ------------------------------------------------------------------ --
-- RLS controls which ROWS a role can see, not which COLUMNS — a column-level
-- GRANT would be the wrong tool here too, since it applies to the role
-- globally (every row), not per-row, so it can't express "full row for your
-- own id, public columns only for everyone else's". A view sidesteps this
-- entirely: it's owned by the migration role (effectively bypassing RLS the
-- same way any table owner/superuser query does) and its column list simply
-- never includes email/timezone/created_at, so there is nothing to leak
-- regardless of which row is being read. The base `profiles` table and its
-- original "own profile" policy are completely untouched — every existing
-- query (Settings, getCurrentUser, auth) keeps working exactly as before.
create or replace view public.profiles_public as
select id, name, username, avatar_url
from public.profiles;

grant select on public.profiles_public to authenticated;

-- ------------------------------------------------------------------ --
-- RLS: connections                                                     --
-- ------------------------------------------------------------------ --

alter table public.connections enable row level security;

drop policy if exists "view own connections" on public.connections;
create policy "view own connections"
  on public.connections for select
  using (requester_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "send connection requests as yourself" on public.connections;
create policy "send connection requests as yourself"
  on public.connections for insert
  with check (requester_id = auth.uid() and receiver_id <> auth.uid());

-- Only the receiver may respond, only while still pending, and the column
-- grant below further restricts them to touching `status` alone — they
-- cannot rewrite requester_id/receiver_id or jump straight to "accepted"
-- from a non-pending row via a crafted request.
drop policy if exists "receiver can respond to a pending request" on public.connections;
create policy "receiver can respond to a pending request"
  on public.connections for update
  using (receiver_id = auth.uid() and status = 'pending')
  with check (receiver_id = auth.uid());

revoke update on public.connections from authenticated;
grant update (status) on public.connections to authenticated;

-- Re-sending after a rejection (flipping the row back to pending with a new
-- requester) is implemented as this same "receiver responds" shape doesn't
-- cover it — handled via a SECURITY DEFINER function below instead, which
-- enforces the identical ownership rules in code.

drop policy if exists "either side can remove a connection" on public.connections;
create policy "either side can remove a connection"
  on public.connections for delete
  using (requester_id = auth.uid() or receiver_id = auth.uid());

-- ------------------------------------------------------------------ --
-- Re-send after rejection                                             --
-- ------------------------------------------------------------------ --
-- A plain INSERT can't express "update this existing rejected row instead,
-- flipping who's requesting now" without relaxing the insert policy. A
-- SECURITY DEFINER function keeps that one extra bit of logic server-side
-- and still fully re-validates the caller's identity itself.
create or replace function public.send_connection_request(target_user_id uuid)
returns public.connections
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  existing public.connections;
  result public.connections;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if me = target_user_id then
    raise exception 'cannot connect with yourself';
  end if;

  select * into existing
  from public.connections
  where least(requester_id, receiver_id) = least(me, target_user_id)
    and greatest(requester_id, receiver_id) = greatest(me, target_user_id);

  if existing.id is null then
    insert into public.connections (requester_id, receiver_id, status)
    values (me, target_user_id, 'pending')
    returning * into result;
    return result;
  end if;

  if existing.status = 'rejected' then
    update public.connections
    set requester_id = me, receiver_id = target_user_id, status = 'pending'
    where id = existing.id
    returning * into result;
    return result;
  end if;

  -- pending or accepted already — nothing to do, hand back the existing row
  -- so the caller can render the right state ("Đã gửi" / already connected).
  return existing;
end;
$$;

grant execute on function public.send_connection_request(uuid) to authenticated;
