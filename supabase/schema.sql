-- Golf OS: Supabase Schema + RLS
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
  excluded_from_card boolean not null default false,
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

-- ============================================================
-- Putters table
-- ============================================================
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

-- ============================================================
-- Putter tests table
-- ============================================================
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
  using (
    exists (
      select 1 from public.putters p
      where p.id = putter_tests.putter_id and p.user_id = auth.uid()
    )
  );
create policy "Users can insert own putter tests"
  on public.putter_tests for insert
  with check (
    exists (
      select 1 from public.putters p
      where p.id = putter_tests.putter_id and p.user_id = auth.uid()
    )
  );
create policy "Users can update own putter tests"
  on public.putter_tests for update
  using (
    exists (
      select 1 from public.putters p
      where p.id = putter_tests.putter_id and p.user_id = auth.uid()
    )
  );
create policy "Users can delete own putter tests"
  on public.putter_tests for delete
  using (
    exists (
      select 1 from public.putters p
      where p.id = putter_tests.putter_id and p.user_id = auth.uid()
    )
  );

-- ============================================================
-- Bag clubs table (user's 14-club bag)
-- ============================================================
create table public.bag_clubs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  club_name text not null,        -- matches Shot.club_name (e.g. "PW", "7 Iron")
  brand text,
  model text,
  loft_deg float8,
  shaft text,
  flex text,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_bag_clubs_user on public.bag_clubs(user_id);

alter table public.bag_clubs enable row level security;

create policy "Users can view own bag clubs"
  on public.bag_clubs for select using (auth.uid() = user_id);
create policy "Users can insert own bag clubs"
  on public.bag_clubs for insert with check (auth.uid() = user_id);
create policy "Users can update own bag clubs"
  on public.bag_clubs for update using (auth.uid() = user_id);
create policy "Users can delete own bag clubs"
  on public.bag_clubs for delete using (auth.uid() = user_id);

-- ============================================================
-- Wedge matrix table (one per user)
-- ============================================================
create table public.wedge_matrix (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  swing_system text not null default 'clock',
  swing_labels text[] not null default '{}',
  wedge_clubs text[] not null default '{}',
  distances jsonb not null default '{}',  -- { "PW|9:00": 85, "SW|7:30": 45, ... }
  notes text,
  created_at timestamptz not null default now(),
  unique(user_id)
);

create index idx_wedge_matrix_user on public.wedge_matrix(user_id);

alter table public.wedge_matrix enable row level security;

create policy "Users can view own wedge matrix"
  on public.wedge_matrix for select using (auth.uid() = user_id);
create policy "Users can insert own wedge matrix"
  on public.wedge_matrix for insert with check (auth.uid() = user_id);
create policy "Users can update own wedge matrix"
  on public.wedge_matrix for update using (auth.uid() = user_id);
create policy "Users can delete own wedge matrix"
  on public.wedge_matrix for delete using (auth.uid() = user_id);
