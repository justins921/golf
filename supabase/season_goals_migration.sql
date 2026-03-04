-- Season Goals table
-- Run this in the Supabase SQL Editor

create table public.season_goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  metric text not null,           -- scoring_avg, best_score, handicap_index, gir_pct, etc.
  target_value float8 not null,
  start_value float8,
  season text not null default '2026',
  notes text,
  achieved_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_season_goals_user on public.season_goals(user_id);
create index idx_season_goals_season on public.season_goals(season);

alter table public.season_goals enable row level security;

create policy "Users can view own goals"
  on public.season_goals for select
  using (auth.uid() = user_id);

create policy "Users can insert own goals"
  on public.season_goals for insert
  with check (auth.uid() = user_id);

create policy "Users can update own goals"
  on public.season_goals for update
  using (auth.uid() = user_id);

create policy "Users can delete own goals"
  on public.season_goals for delete
  using (auth.uid() = user_id);

-- Also add course_rating and slope_rating to rounds if not already present
alter table public.rounds add column if not exists course_rating float8;
alter table public.rounds add column if not exists slope_rating int;
