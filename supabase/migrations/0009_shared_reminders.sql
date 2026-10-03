-- Share Reminder: a reminder stays otherwise private, but its owner may
-- optionally tag exactly ONE accepted Connection who can then also see it.
-- Not group sharing, not a public reminder — a single nullable column on
-- the existing `reminders` row is the entire schema change.
--
-- Every statement is safe to run more than once (idempotent), same
-- convention as 0005/0006/0007/0008. This file does not modify any of them.

-- ------------------------------------------------------------------ --
-- reminders — shared_with_user_id                                      --
-- ------------------------------------------------------------------ --
-- ON DELETE SET NULL (not CASCADE): if the recipient's account is later
-- deleted, the owner's reminder must survive — only the sharing itself
-- quietly goes away, since the reminder was always the owner's data, not
-- the recipient's.
alter table public.reminders
  add column if not exists shared_with_user_id uuid references public.profiles(id) on delete set null;

-- Partial — most reminders will never be shared, so indexing only the rows
-- that are keeps this cheap.
create index if not exists idx_reminders_shared_with
  on public.reminders (shared_with_user_id)
  where shared_with_user_id is not null;

-- Belt-and-suspenders: self-sharing is already impossible in practice (an
-- "accepted connection" with yourself cannot exist, see connections_no_self
-- in 0005), but this makes the invariant explicit and DB-enforced
-- regardless of how a row is ever written.
alter table public.reminders drop constraint if exists reminders_no_self_share;
alter table public.reminders add constraint reminders_no_self_share
  check (shared_with_user_id is null or shared_with_user_id <> user_id);

-- ------------------------------------------------------------------ --
-- is_accepted_connection — "is this pair an accepted Connection?"      --
-- ------------------------------------------------------------------ --
-- Used from check_reminder_share() below. SECURITY DEFINER matches the
-- established pattern from 0007/0006 (is_conversation_member,
-- get_or_create_conversation) and keeps the authorization check
-- self-contained and independently auditable rather than depending on
-- connections' RLS shape staying exactly as it is today. Returns only a
-- boolean — no row data, no additional information exposed.
create or replace function public.is_accepted_connection(a uuid, b uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.connections
    where status = 'accepted'
      and least(requester_id, receiver_id) = least(a, b)
      and greatest(requester_id, receiver_id) = greatest(a, b)
  );
$$;

grant execute on function public.is_accepted_connection(uuid, uuid) to authenticated;

-- ------------------------------------------------------------------ --
-- check_reminder_share — validates shared_with_user_id TRANSITIONS     --
-- ------------------------------------------------------------------ --
-- Why a trigger and not a WITH CHECK condition:
--
-- The naive approach is to put `is_accepted_connection(user_id,
-- shared_with_user_id)` directly in the "own reminders" policy's WITH
-- CHECK, same as INSERT. That breaks a real, intended flow: if A shares a
-- reminder with B, the A<->B Connection is later removed, and A then edits
-- the reminder's title while leaving `shared_with_user_id` pointing at B
-- unchanged — WITH CHECK would see "B is not currently an accepted
-- connection" and reject the UPDATE entirely, even though A isn't trying to
-- (re)create a share with B, just keep the one that already exists and edit
-- something unrelated.
--
-- WITH CHECK has no reliable way to distinguish "this value is unchanged
-- from before" from "this value was just set" — it only sees the proposed
-- new row, and by the time an UPDATE's WITH CHECK runs, the heap tuple
-- already reflects the new values, so even a self-referencing subquery
-- against `reminders` from inside the policy would see the NEW row, not the
-- row as it was before this statement. A BEFORE trigger does not have this
-- problem: `OLD` and `NEW` are real pre-image/post-image row values handed
-- to the trigger function directly, not derived by re-querying the table.
--
-- So the validation that actually needs to compare "before" and "after"
-- lives here, in a trigger, while RLS keeps doing what it's good at (who is
-- allowed to touch the row at all). SECURITY DEFINER + empty search_path
-- for the same reason as is_accepted_connection: the function's internal
-- logic must not depend on the caller's privileges or a mutable search
-- path, and every identifier it touches is schema-qualified.
create or replace function public.check_reminder_share()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- New row — any non-null shared_with_user_id is a brand new share and
    -- must be an accepted connection of the owner being inserted.
    if new.shared_with_user_id is not null
       and not public.is_accepted_connection(new.user_id, new.shared_with_user_id) then
      raise exception 'shared_with_user_id must be an accepted connection of the owner';
    end if;
    return new;
  end if;

  -- tg_op = 'UPDATE' from here on (trigger is only installed for INSERT/UPDATE).
  if new.shared_with_user_id is not distinct from old.shared_with_user_id then
    -- Unchanged (including null -> null, or the same recipient kept as-is).
    -- Never re-validated — this is exactly the "connection was removed
    -- after sharing, but the existing share must keep working" case.
    return new;
  end if;

  -- The value is actually changing (null -> someone, someone -> null, or
  -- recipient A -> recipient B). Only the "-> someone" direction needs a
  -- check; clearing a share (-> null) is always allowed.
  if new.shared_with_user_id is not null
     and not public.is_accepted_connection(new.user_id, new.shared_with_user_id) then
    raise exception 'shared_with_user_id must be an accepted connection of the owner';
  end if;

  return new;
end;
$$;

drop trigger if exists reminders_check_share on public.reminders;
create trigger reminders_check_share
  before insert or update on public.reminders
  for each row
  execute function public.check_reminder_share();

-- ------------------------------------------------------------------ --
-- RLS: reminders                                                       --
-- ------------------------------------------------------------------ --
-- Ownership only — exactly the original "own reminders" policy, untouched
-- in shape. All shared_with_user_id validation now lives in the trigger
-- above (see its comment for why), so this policy does not need, and must
-- NOT re-add, any is_accepted_connection condition of its own: doing so
-- would reintroduce the exact "connection removed -> stuck reminder" bug
-- this migration fixes.
drop policy if exists "own reminders" on public.reminders;
create policy "own reminders" on public.reminders
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Purely additive SELECT policy — does not touch INSERT/UPDATE/DELETE at
-- all (a user who is only the recipient, never the owner, still can't pass
-- the "own reminders" policy's using() clause for those commands).
-- Multiple permissive policies for the same command are OR'd together in
-- Postgres, so this only ever ADDS read visibility, never removes any.
--
-- Deliberately NOT conditioned on the connection still being accepted: the
-- product requirement is that an existing share keeps working for the
-- recipient until the owner explicitly removes it (see check_reminder_share
-- above for the matching write-side behavior).
drop policy if exists "view reminders shared with you" on public.reminders;
create policy "view reminders shared with you" on public.reminders
  for select
  using (shared_with_user_id = auth.uid());
