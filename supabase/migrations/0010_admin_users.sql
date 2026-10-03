-- Admin authorization boundary (Phase 1 of the Admin Portal): a dedicated,
-- deliberately locked-down table that answers exactly one question — "is
-- this user_id an admin?" — and nothing else about them.
--
-- This is NOT a role flag on `profiles`. Keeping it a separate table means
-- zero existing RLS policy on profiles/reminders/connections/conversations/
-- conversation_members/messages needs to be touched, re-reasoned about, or
-- re-tested — this migration does not modify any of them.
--
-- Safe to run more than once (idempotent), same convention as
-- 0005-0009. Does not modify 0001-0009.

create table if not exists public.admin_users (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  role        text not null default 'admin' check (role = 'admin'),
  granted_by  uuid references public.profiles(id) on delete set null,
  granted_at  timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- Deliberately NO policy for `authenticated` — not SELECT, not INSERT, not
-- UPDATE, not DELETE. With RLS enabled and zero permissive policies, every
-- row is unreadable and unwritable through the normal session-scoped
-- client, for every user, including an admin reading about themselves.
-- There is nothing to "grant" here: this absence IS the security property.
--
-- The only way anything ever reads this table is the service-role client
-- (src/lib/supabase/admin.ts), which bypasses RLS entirely by design, used
-- exclusively from src/lib/admin/auth.ts (server-only, never imported by
-- client code). The only way a row is ever written is a manual insert run
-- directly against the database (e.g. via Supabase Studio) by someone with
-- direct database access — there is intentionally no app code path, no
-- Server Action, and no UI that can create a row here in this phase.
