-- Debrief Enhancement Migration
-- Run this in the Supabase SQL Editor

-- ============================================================
-- 1. Add miss direction columns to round_holes
-- ============================================================

-- Tee shot miss direction (when fairway_hit = false)
-- Values: 'left', 'right', 'short', 'long', null
alter table public.round_holes
  add column if not exists tee_miss_direction text;

-- Approach shot miss direction (when gir = false)
-- Values: 'short', 'long', 'left', 'right', 'short_left', 'short_right', 'long_left', 'long_right', null
alter table public.round_holes
  add column if not exists approach_miss_direction text;

-- ============================================================
-- 2. Debrief shares (share a read-only debrief with a coach)
-- ============================================================

create table if not exists public.debrief_shares (
  id uuid primary key default uuid_generate_v4(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  share_token text not null unique,        -- Random token for share URL
  recipient_email text,                    -- Optional: coach's email
  recipient_name text,                     -- Optional: coach's name
  can_add_notes boolean not null default true,  -- Can recipient add notes?
  expires_at timestamptz,                  -- Optional expiration
  created_at timestamptz not null default now()
);

create index if not exists idx_debrief_shares_owner on public.debrief_shares(owner_id);
create index if not exists idx_debrief_shares_token on public.debrief_shares(share_token);
create index if not exists idx_debrief_shares_round on public.debrief_shares(round_id);

alter table public.debrief_shares enable row level security;

-- Owner can do everything with their shares
create policy "Owners can manage own shares"
  on public.debrief_shares for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Anyone with the token can view (for unauthenticated coach access)
create policy "Anyone with token can view shares"
  on public.debrief_shares for select
  using (true);

-- ============================================================
-- 3. Coach notes on shared debriefs
-- ============================================================

create table if not exists public.debrief_coach_notes (
  id uuid primary key default uuid_generate_v4(),
  share_id uuid not null references public.debrief_shares(id) on delete cascade,
  author_name text not null,               -- Coach name (no auth required)
  note_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_debrief_coach_notes_share on public.debrief_coach_notes(share_id);

alter table public.debrief_coach_notes enable row level security;

-- Anyone can view/insert coach notes (shared context)
create policy "Anyone can view coach notes"
  on public.debrief_coach_notes for select
  using (true);

create policy "Anyone can add coach notes"
  on public.debrief_coach_notes for insert
  with check (true);

-- Only the round owner can delete coach notes
create policy "Round owners can delete coach notes"
  on public.debrief_coach_notes for delete
  using (
    exists (
      select 1 from public.debrief_shares ds
      where ds.id = debrief_coach_notes.share_id and ds.owner_id = auth.uid()
    )
  );
