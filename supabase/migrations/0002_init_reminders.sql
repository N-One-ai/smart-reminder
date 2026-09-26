-- reminders (see prd-smart-reminder.md §C for field-by-field rationale)
create table public.reminders (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  title                text not null,
  description          text not null default '',

  -- Civil date/time as the user meant it, not UTC-shifted at write time.
  -- Real instant = (date + time) AT TIME ZONE timezone, computed on read.
  date                 date not null,
  time                 time not null,
  timezone             text not null,

  repeat_rule          jsonb,
  status               text not null default 'pending'
                          check (status in ('pending', 'completed')),
  completed_at         timestamptz,
  last_completed_date  date,

  notified_at          timestamptz,

  source               text not null default 'ai'
                          check (source in ('ai', 'manual')),
  ai_confidence        numeric(3, 2),
  metadata             jsonb not null default '{}',

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index idx_reminders_user_status_date
  on public.reminders (user_id, status, date, time);

alter table public.reminders enable row level security;

create policy "own reminders" on public.reminders
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

create function public.bump_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_reminders_updated
  before update on public.reminders
  for each row execute function public.bump_updated_at();
