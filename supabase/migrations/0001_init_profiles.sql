-- profiles: extends auth.users 1-1 (see prd-smart-reminder.md §C)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  email       text not null,
  timezone    text not null default 'Asia/Ho_Chi_Minh',
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid())
  with check (id = auth.uid());

-- Auto-create a profile row whenever a new auth user signs up, so the app
-- never has to remember to do this client-side (per user flow §B: "Đăng ký
-- → Supabase Auth tạo user → trigger tạo row profiles").
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
