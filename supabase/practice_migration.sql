-- ============================================================
-- Practice Module Migration
-- Run this in Supabase SQL Editor to add practice tables.
-- ============================================================

-- Practice sessions
create table public.practice_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null default 'PROGRAM',  -- PROGRAM | RANDOM | TIME_DRILL
  program_id text,                        -- references seed program id
  category text,                          -- wedges | full_swing | putting | short_game | random
  drill_id text,                          -- references seed drill id
  location text,                          -- range | home_sim | putting_mat | course
  plan jsonb,                             -- generated plan for Random/Time sessions
  notes text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_practice_sessions_user on public.practice_sessions(user_id);
create index idx_practice_sessions_created on public.practice_sessions(created_at);

alter table public.practice_sessions enable row level security;

create policy "Users can view own practice sessions"
  on public.practice_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own practice sessions"
  on public.practice_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own practice sessions"
  on public.practice_sessions for update using (auth.uid() = user_id);
create policy "Users can delete own practice sessions"
  on public.practice_sessions for delete using (auth.uid() = user_id);

-- Practice shots
create table public.practice_shots (
  id uuid primary key default uuid_generate_v4(),
  practice_session_id uuid not null references public.practice_sessions(id) on delete cascade,
  timestamp timestamptz not null default now(),
  club_name text not null,
  club_type text not null default 'wedge',
  target_distance_yd float8 not null,
  carry_distance_yd float8 not null,
  lateral_yd float8,
  is_mishit boolean not null default false,
  computed jsonb,  -- { error, leaveDistance, sg, points }
  tags text[] default '{}'
);

create index idx_practice_shots_session on public.practice_shots(practice_session_id);
create index idx_practice_shots_club on public.practice_shots(club_name);
create index idx_practice_shots_timestamp on public.practice_shots(timestamp);

alter table public.practice_shots enable row level security;

create policy "Users can view own practice shots"
  on public.practice_shots for select
  using (
    exists (
      select 1 from public.practice_sessions ps
      where ps.id = practice_shots.practice_session_id and ps.user_id = auth.uid()
    )
  );
create policy "Users can insert own practice shots"
  on public.practice_shots for insert
  with check (
    exists (
      select 1 from public.practice_sessions ps
      where ps.id = practice_shots.practice_session_id and ps.user_id = auth.uid()
    )
  );
create policy "Users can update own practice shots"
  on public.practice_shots for update
  using (
    exists (
      select 1 from public.practice_sessions ps
      where ps.id = practice_shots.practice_session_id and ps.user_id = auth.uid()
    )
  );
create policy "Users can delete own practice shots"
  on public.practice_shots for delete
  using (
    exists (
      select 1 from public.practice_sessions ps
      where ps.id = practice_shots.practice_session_id and ps.user_id = auth.uid()
    )
  );
