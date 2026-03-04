-- ============================================================
-- Migration: Instruction, Mental Game & Course Strategy modules
-- ============================================================

-- ============================================================
-- 1. Lessons (Instruction module)
-- ============================================================

create table if not exists public.lessons (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_date text not null,
  coach_name text,
  lesson_type text not null default 'full_swing',  -- full_swing, short_game, putting, playing, other
  duration_min integer,
  focus_areas text[] not null default '{}',
  drills_assigned jsonb not null default '[]',       -- [{name, description, reps}]
  swing_feels text[] not null default '{}',          -- key feels/cues to remember
  notes text,
  rating integer,                                     -- 1-5 how productive
  next_lesson_goals text,
  created_at timestamptz not null default now()
);

alter table public.lessons enable row level security;

create policy "Users can manage their own lessons"
  on public.lessons for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_lessons_user_date
  on public.lessons (user_id, lesson_date desc);

-- ============================================================
-- 2. Mental game logs
-- ============================================================

create table if not exists public.mental_game_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date text not null,
  log_type text not null default 'journal',  -- journal, pre_round, post_round, visualization
  mood_rating integer,                        -- 1-5
  confidence_rating integer,                  -- 1-5
  focus_rating integer,                       -- 1-5
  pre_shot_routine text,
  commitment_level integer,                   -- 1-5 how committed to shots
  mental_triggers text[] not null default '{}',  -- what caused mental lapses
  positive_moments text[] not null default '{}', -- what went well mentally
  round_id uuid references public.rounds(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.mental_game_logs enable row level security;

create policy "Users can manage their own mental game logs"
  on public.mental_game_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_mental_game_user_date
  on public.mental_game_logs (user_id, log_date desc);

-- ============================================================
-- 3. Course strategies
-- ============================================================

create table if not exists public.course_strategies (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  course_name text not null,
  tee_set text,
  hole_strategies jsonb not null default '[]',  -- [{hole, par, yardage, strategy, club_off_tee, target, miss_zone, notes}]
  general_notes text,
  weather_adjustments text,
  scoring_target integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.course_strategies enable row level security;

create policy "Users can manage their own course strategies"
  on public.course_strategies for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_course_strategies_user
  on public.course_strategies (user_id, course_name);
