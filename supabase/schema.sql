-- Dispersion Lab: Supabase Schema + RLS
-- Run this in the Supabase SQL Editor

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- Sessions table
-- ============================================================
create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  imported_at timestamptz not null default now(),
  played_at timestamptz,
  location_text text,
  lat float8,
  lon float8,
  environment jsonb,  -- { elevationFt, temperatureF, relativeHumidityPct, pressureInHg }
  notes text,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_sessions_user on public.sessions(user_id);
create index idx_sessions_played on public.sessions(played_at);

-- RLS
alter table public.sessions enable row level security;

create policy "Users can view own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on public.sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on public.sessions for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Shots table
-- ============================================================
create table public.shots (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  datetime timestamptz,
  club_name text not null,
  club_type text not null,
  carry_distance_yd float8 not null,
  carry_lateral_yd float8 not null,
  total_distance_yd float8 not null,
  total_lateral_yd float8 not null,
  is_full_shot boolean not null default true,
  target_distance_yd float8,
  tags text[] not null default '{}',
  notes text,
  raw jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_shots_session on public.shots(session_id);
create index idx_shots_club on public.shots(club_name);
create index idx_shots_full on public.shots(is_full_shot);

-- RLS
alter table public.shots enable row level security;

create policy "Users can view own shots"
  on public.shots for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = shots.session_id and s.user_id = auth.uid()
    )
  );

create policy "Users can insert own shots"
  on public.shots for insert
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = shots.session_id and s.user_id = auth.uid()
    )
  );

create policy "Users can update own shots"
  on public.shots for update
  using (
    exists (
      select 1 from public.sessions s
      where s.id = shots.session_id and s.user_id = auth.uid()
    )
  );

create policy "Users can delete own shots"
  on public.shots for delete
  using (
    exists (
      select 1 from public.sessions s
      where s.id = shots.session_id and s.user_id = auth.uid()
    )
  );
