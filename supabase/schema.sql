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

-- ============================================================
-- Speed training sessions
-- ============================================================
create table public.speed_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null default current_date,
  protocol text not null default 'TheStack',  -- TheStack, SuperSpeed, Rypstick, Other
  program text,                                -- e.g. "Speed 1", "Distance", custom name
  notes text,
  created_at timestamptz not null default now()
);

create index idx_speed_sessions_user on public.speed_sessions(user_id);
create index idx_speed_sessions_date on public.speed_sessions(session_date);

alter table public.speed_sessions enable row level security;

create policy "Users can view own speed sessions"
  on public.speed_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own speed sessions"
  on public.speed_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own speed sessions"
  on public.speed_sessions for update using (auth.uid() = user_id);
create policy "Users can delete own speed sessions"
  on public.speed_sessions for delete using (auth.uid() = user_id);

-- ============================================================
-- Speed training readings (individual swings within a session)
-- ============================================================
create table public.speed_readings (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.speed_sessions(id) on delete cascade,
  set_number int not null default 1,
  rep_number int not null default 1,
  club text not null,                  -- Driver, Training Light, Training Heavy, 6 Iron, etc.
  clubhead_speed_mph float8,
  ball_speed_mph float8,
  smash_factor float8,
  carry_distance_yd float8,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_speed_readings_session on public.speed_readings(session_id);

alter table public.speed_readings enable row level security;

create policy "Users can view own speed readings"
  on public.speed_readings for select
  using (exists (select 1 from public.speed_sessions ss where ss.id = speed_readings.session_id and ss.user_id = auth.uid()));
create policy "Users can insert own speed readings"
  on public.speed_readings for insert
  with check (exists (select 1 from public.speed_sessions ss where ss.id = speed_readings.session_id and ss.user_id = auth.uid()));
create policy "Users can update own speed readings"
  on public.speed_readings for update
  using (exists (select 1 from public.speed_sessions ss where ss.id = speed_readings.session_id and ss.user_id = auth.uid()));
create policy "Users can delete own speed readings"
  on public.speed_readings for delete
  using (exists (select 1 from public.speed_sessions ss where ss.id = speed_readings.session_id and ss.user_id = auth.uid()));

-- ============================================================
-- Fitness workout logs
-- ============================================================
create table public.workout_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_date date not null default current_date,
  workout_type text not null,          -- warmup, mobility, strength, power, full
  program text,                        -- GolfForever, Fit for Golf, Custom
  workout_name text not null,          -- "Upper Body Push", "Pre-Round Warmup", etc.
  duration_min int,
  exercises jsonb not null default '[]', -- [{name, sets, reps, weight, duration_sec, notes}]
  rating int,                          -- 1-5 subjective difficulty
  notes text,
  created_at timestamptz not null default now()
);

create index idx_workout_logs_user on public.workout_logs(user_id);
create index idx_workout_logs_date on public.workout_logs(workout_date);

alter table public.workout_logs enable row level security;

create policy "Users can view own workout logs"
  on public.workout_logs for select using (auth.uid() = user_id);
create policy "Users can insert own workout logs"
  on public.workout_logs for insert with check (auth.uid() = user_id);
create policy "Users can update own workout logs"
  on public.workout_logs for update using (auth.uid() = user_id);
create policy "Users can delete own workout logs"
  on public.workout_logs for delete using (auth.uid() = user_id);

-- ============================================================
-- Rounds (on-course scorecards)
-- ============================================================
create table public.rounds (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  round_date date not null default current_date,
  course_name text not null,
  tees text,                           -- "Blue", "White", etc.
  holes_played int not null default 18,
  total_score int,
  total_putts int,
  total_fairways_hit int,
  total_fairways int,                  -- total fairway holes (par 4s + par 5s)
  total_gir int,
  total_penalties int not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_rounds_user on public.rounds(user_id);
create index idx_rounds_date on public.rounds(round_date);

alter table public.rounds enable row level security;

create policy "Users can view own rounds"
  on public.rounds for select using (auth.uid() = user_id);
create policy "Users can insert own rounds"
  on public.rounds for insert with check (auth.uid() = user_id);
create policy "Users can update own rounds"
  on public.rounds for update using (auth.uid() = user_id);
create policy "Users can delete own rounds"
  on public.rounds for delete using (auth.uid() = user_id);

-- ============================================================
-- Round holes (hole-by-hole detail)
-- ============================================================
create table public.round_holes (
  id uuid primary key default uuid_generate_v4(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  hole_number int not null,
  par int not null default 4,
  score int,
  putts int,
  fairway_hit boolean,                 -- null for par 3s
  gir boolean,
  up_and_down boolean,                 -- attempted chip/pitch to save par
  sand_save boolean,
  penalty_strokes int not null default 0,
  club_off_tee text,
  approach_distance_yd int,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_round_holes_round on public.round_holes(round_id);

alter table public.round_holes enable row level security;

create policy "Users can view own round holes"
  on public.round_holes for select
  using (exists (select 1 from public.rounds r where r.id = round_holes.round_id and r.user_id = auth.uid()));
create policy "Users can insert own round holes"
  on public.round_holes for insert
  with check (exists (select 1 from public.rounds r where r.id = round_holes.round_id and r.user_id = auth.uid()));
create policy "Users can update own round holes"
  on public.round_holes for update
  using (exists (select 1 from public.rounds r where r.id = round_holes.round_id and r.user_id = auth.uid()));
create policy "Users can delete own round holes"
  on public.round_holes for delete
  using (exists (select 1 from public.rounds r where r.id = round_holes.round_id and r.user_id = auth.uid()));
