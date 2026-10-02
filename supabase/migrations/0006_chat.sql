-- 1-to-1 Chat (Phase 1): text-only conversations between two ACCEPTED
-- connections. No group chat, no shared reminders, no AI involvement here —
-- deliberately the smallest schema that supports a real conversation.
--
-- Every statement in this file is written to be safe to run more than once
-- (idempotent), same convention as 0005_connections.sql. This file does not
-- modify 0005 or anything it created.

-- ------------------------------------------------------------------ --
-- conversations — exactly one row per connected pair                   --
-- ------------------------------------------------------------------ --
-- user_a_id/user_b_id are stored in canonical order (a < b) purely so a
-- plain UNIQUE constraint can guarantee "at most one conversation per pair"
-- without a race-prone select-then-insert — the ordering check plus the
-- unique constraint together make A-then-B and B-then-A collide into the
-- same row at the database level.
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  user_a_id   uuid not null references public.profiles(id) on delete cascade,
  user_b_id   uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint conversations_ordered_pair check (user_a_id < user_b_id)
);

create unique index if not exists conversations_unique_pair_idx
  on public.conversations (user_a_id, user_b_id);

-- ------------------------------------------------------------------ --
-- conversation_members — who's in the conversation + their read cursor --
-- ------------------------------------------------------------------ --
-- A separate membership table (rather than only the two columns above)
-- keeps RLS on `messages` a single uniform EXISTS check, and gives each
-- member their own `last_read_at` for the unread-count feature, with a
-- natural path to group chat later without a schema change.
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists conversation_members_user_idx
  on public.conversation_members (user_id);

-- ------------------------------------------------------------------ --
-- messages                                                             --
-- ------------------------------------------------------------------ --
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  content         text not null,
  created_at      timestamptz not null default now(),
  constraint messages_content_not_blank check (char_length(btrim(content)) > 0),
  constraint messages_content_max_length check (char_length(content) <= 2000)
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

-- ------------------------------------------------------------------ --
-- get_or_create_conversation                                          --
-- ------------------------------------------------------------------ --
-- The only way a conversation row is ever created. Re-validates the
-- caller's identity and the connection itself server-side (never trusts
-- that the client-side "Chat" button only appears for real connections),
-- and handles the create-vs-reuse race atomically via the unique index
-- above rather than a check-then-insert that could lose a race.
create or replace function public.get_or_create_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  lo uuid;
  hi uuid;
  convo_id uuid;
  is_connected boolean;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if other_user_id is null then
    raise exception 'other_user_id is required';
  end if;
  if me = other_user_id then
    raise exception 'cannot chat with yourself';
  end if;

  select exists (
    select 1 from public.connections c
    where c.status = 'accepted'
      and least(c.requester_id, c.receiver_id) = least(me, other_user_id)
      and greatest(c.requester_id, c.receiver_id) = greatest(me, other_user_id)
  ) into is_connected;

  if not is_connected then
    raise exception 'not connected';
  end if;

  lo := least(me, other_user_id);
  hi := greatest(me, other_user_id);

  insert into public.conversations (user_a_id, user_b_id)
  values (lo, hi)
  on conflict (user_a_id, user_b_id) do nothing
  returning id into convo_id;

  if convo_id is null then
    select id into convo_id from public.conversations
    where user_a_id = lo and user_b_id = hi;
  end if;

  insert into public.conversation_members (conversation_id, user_id)
  values (convo_id, me), (convo_id, other_user_id)
  on conflict (conversation_id, user_id) do nothing;

  return convo_id;
end;
$$;

grant execute on function public.get_or_create_conversation(uuid) to authenticated;

-- ------------------------------------------------------------------ --
-- unread_message_counts — per-user, per-conversation unread count      --
-- ------------------------------------------------------------------ --
-- security_invoker = true (PG15+) makes auth.uid() resolve to the actual
-- caller and the underlying RLS apply as that caller, not as the view's
-- owner — the same correctness property profiles_public deliberately does
-- NOT have (that one intentionally bypasses RLS to be public; this one
-- must not). The explicit `where cm.user_id = auth.uid()` is belt-and-
-- suspenders on top of that: even though conversation_members' own RLS
-- lets a member see the OTHER participant's membership row too (needed to
-- know who they're chatting with), this view only ever computes counts
-- for the caller's own row, never leaking the other person's read cursor.
create or replace view public.unread_message_counts
with (security_invoker = true)
as
select
  cm.conversation_id,
  count(m.id) as unread_count
from public.conversation_members cm
join public.messages m
  on m.conversation_id = cm.conversation_id
  and m.created_at > cm.last_read_at
  and m.sender_id <> cm.user_id
where cm.user_id = auth.uid()
group by cm.conversation_id;

grant select on public.unread_message_counts to authenticated;

-- ------------------------------------------------------------------ --
-- RLS: conversations                                                   --
-- ------------------------------------------------------------------ --
-- No INSERT policy for `authenticated` at all — the only way a row is
-- created is through get_or_create_conversation (SECURITY DEFINER), which
-- re-validates the connection itself. Default-deny covers INSERT/UPDATE/
-- DELETE for everyone else.
alter table public.conversations enable row level security;

drop policy if exists "view own conversations" on public.conversations;
create policy "view own conversations"
  on public.conversations for select
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversations.id
        and cm.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------------ --
-- RLS: conversation_members                                           --
-- ------------------------------------------------------------------ --
alter table public.conversation_members enable row level security;

-- Lets a member see BOTH membership rows of a shared conversation (their
-- own and the other participant's) — needed to know who they're chatting
-- with, not just that a conversation exists.
drop policy if exists "view members of own conversations" on public.conversation_members;
create policy "view members of own conversations"
  on public.conversation_members for select
  using (
    exists (
      select 1 from public.conversation_members cm_self
      where cm_self.conversation_id = conversation_members.conversation_id
        and cm_self.user_id = auth.uid()
    )
  );

-- Marking a conversation as read: a member may update ONLY their own row,
-- and the column grant below further restricts that to `last_read_at`
-- alone — they cannot touch anyone else's read cursor or any other column.
drop policy if exists "member can update own read cursor" on public.conversation_members;
create policy "member can update own read cursor"
  on public.conversation_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke update on public.conversation_members from authenticated;
grant update (last_read_at) on public.conversation_members to authenticated;

-- ------------------------------------------------------------------ --
-- RLS: messages                                                        --
-- ------------------------------------------------------------------ --
alter table public.messages enable row level security;

drop policy if exists "view messages in own conversations" on public.messages;
create policy "view messages in own conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id = auth.uid()
    )
  );

-- Can only send as yourself, and only into a conversation you belong to —
-- this is what makes "guess a conversation ID and post into it" impossible
-- even though message IDs/conversation IDs are plain UUIDs, not secrets.
drop policy if exists "send messages to own conversations" on public.messages;
create policy "send messages to own conversations"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id = auth.uid()
    )
  );

-- No UPDATE/DELETE policy for messages in this phase — messages are
-- immutable once sent (matches "not modify another user's messages", and
-- there's no edit/delete feature in scope yet either).

-- ------------------------------------------------------------------ --
-- Realtime — stream INSERTs on messages to subscribed clients          --
-- ------------------------------------------------------------------ --
-- Supabase Realtime's postgres_changes still enforces the SELECT RLS
-- policy above for each subscriber, using their own session — a client
-- only receives INSERT events for conversations they're a member of. This
-- does not grant any access beyond what the policies already allow.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
