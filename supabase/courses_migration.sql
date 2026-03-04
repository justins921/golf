-- Courses table
-- Run this in the Supabase SQL Editor

create table public.courses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  city text,
  state text,
  tee_sets jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_courses_user on public.courses(user_id);
create index idx_courses_name on public.courses(name);

alter table public.courses enable row level security;

create policy "Users can view own courses"
  on public.courses for select
  using (auth.uid() = user_id);

create policy "Users can insert own courses"
  on public.courses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own courses"
  on public.courses for update
  using (auth.uid() = user_id);

create policy "Users can delete own courses"
  on public.courses for delete
  using (auth.uid() = user_id);
