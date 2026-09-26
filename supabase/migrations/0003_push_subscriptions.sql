-- Web Push subscriptions (V2 — see prd-smart-reminder.md V2 roadmap).
-- One row per browser/device the user has enabled push on; a user can have
-- several (phone + laptop). endpoint is the PushSubscription's unique URL,
-- so it doubles as a natural dedupe key on re-subscribe.
create table public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  created_at   timestamptz not null default now()
);

create index idx_push_subscriptions_user
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "own push subscriptions" on public.push_subscriptions
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());
