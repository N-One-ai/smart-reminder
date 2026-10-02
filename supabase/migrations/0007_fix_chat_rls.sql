-- Fixes a production bug in 0006_chat.sql (already executed): the
-- "view members of own conversations" policy on conversation_members
-- queries conversation_members from inside its own USING clause. Postgres
-- re-applies that same policy to the subquery's scan of the table, which
-- re-triggers the subquery, forever — error 42P17 "infinite recursion
-- detected in policy for relation conversation_members". This surfaced as
-- every Chat page load and every Connections unread-badge fetch failing.
--
-- This migration changes ONLY that one policy (via a SECURITY DEFINER
-- helper function). Nothing else from 0006 — tables, other policies,
-- get_or_create_conversation(), unread_message_counts, Realtime — is
-- touched. Safe to run more than once (idempotent).

-- ------------------------------------------------------------------ --
-- is_conversation_member — membership check for RLS, without recursion --
-- ------------------------------------------------------------------ --
-- SECURITY DEFINER makes this function's internal query run with the
-- function owner's privileges rather than the calling role's — so it is
-- not itself subject to conversation_members' RLS, which is exactly what
-- breaks the recursion: the policy no longer re-queries a table that is
-- re-applying the same policy to answer that query.
--
-- `set search_path = ''` (empty) is the stricter alternative to pinning it
-- to `public`: with no implicit schema resolution at all, every identifier
-- in the function body MUST be schema-qualified for the function to even
-- compile, which is already the case here (`public.conversation_members`),
-- so this costs nothing and removes any reliance on `public` staying
-- exactly as expected.
create or replace function public.is_conversation_member(p_conversation_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation_id
      and user_id = p_user_id
  );
$$;

-- Required: the policy below calls this function while evaluating a query
-- run AS the `authenticated` role — that role needs EXECUTE on the
-- function itself, independent of SECURITY DEFINER (which only affects
-- what the function's own body is allowed to read, not who may call it).
grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;

-- ------------------------------------------------------------------ --
-- Replace the recursive policy — same authorization, no recursion      --
-- ------------------------------------------------------------------ --
-- Unchanged semantics: a member can see every membership row (their own
-- and the other participant's) of any conversation they themselves belong
-- to; nothing from a conversation they're not part of.
drop policy if exists "view members of own conversations" on public.conversation_members;
create policy "view members of own conversations"
  on public.conversation_members for select
  using (public.is_conversation_member(conversation_id, auth.uid()));
