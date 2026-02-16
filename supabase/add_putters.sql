-- Run this in Supabase SQL Editor to add putter tables

create table public.putters (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  length_in float8,
  lie_angle_deg float8,
  loft_deg float8,
  neck_type text,
  grip text,
  swing_weight text,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_putters_user on public.putters(user_id);
alter table public.putters enable row level security;

create policy "Users can view own putters"
  on public.putters for select using (auth.uid() = user_id);
create policy "Users can insert own putters"
  on public.putters for insert with check (auth.uid() = user_id);
create policy "Users can update own putters"
  on public.putters for update using (auth.uid() = user_id);
create policy "Users can delete own putters"
  on public.putters for delete using (auth.uid() = user_id);

create table public.putter_tests (
  id uuid primary key default uuid_generate_v4(),
  putter_id uuid not null references public.putters(id) on delete cascade,
  test_date date not null default current_date,
  drill text not null,
  distance_ft int,
  made int not null default 0,
  attempted int not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_putter_tests_putter on public.putter_tests(putter_id);
create index idx_putter_tests_date on public.putter_tests(test_date);
alter table public.putter_tests enable row level security;

create policy "Users can view own putter tests"
  on public.putter_tests for select
  using (putter_id in (select id from public.putters where user_id = auth.uid()));

create policy "Users can insert own putter tests"
  on public.putter_tests for insert
  with check (putter_id in (select id from public.putters where user_id = auth.uid()));

create policy "Users can update own putter tests"
  on public.putter_tests for update
  using (putter_id in (select id from public.putters where user_id = auth.uid()));

create policy "Users can delete own putter tests"
  on public.putter_tests for delete
  using (putter_id in (select id from public.putters where user_id = auth.uid()));
