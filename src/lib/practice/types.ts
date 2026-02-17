/**
 * Practice module types — kept separate from core types.ts to keep things modular.
 */

// ============================================================
// Enums
// ============================================================

export type PracticeMode = 'PROGRAM' | 'RANDOM' | 'TIME_DRILL';
export type DrillCategory = 'wedges' | 'full_swing' | 'putting' | 'short_game' | 'random';
export type ScoringMethod = 'points' | 'make_pct' | 'proximity';
export type PracticeLocation = 'range' | 'home_sim' | 'putting_mat' | 'course';

// ============================================================
// Drill definitions (seed data, not user-created)
// ============================================================

export interface PracticeDrill {
  id: string;
  name: string;
  category: DrillCategory;
  description: string;
  defaultDurations: number[]; // minutes
  scoringMethod: ScoringMethod;
  instructions: string[];
  clubFilter?: string[]; // optional: which clubs apply
  locations: PracticeLocation[]; // where it can be done
}

// ============================================================
// Program / workout / step structure
// ============================================================

export interface PracticeProgram {
  id: string;
  name: string;
  category: DrillCategory;
  description: string;
}

export interface PracticeWorkout {
  id: string;
  programId: string;
  name: string;
  orderIndex: number;
}

export interface PracticeStep {
  id: string;
  workoutId: string;
  orderIndex: number;
  drillId: string;
  clubTypeFilter: string | null;
  clubNameFilter: string | null;
  reps: number | null;
  durationSeconds: number | null;
  targetRules: TargetRules | null;
}

export interface TargetRules {
  mode: 'ladder' | 'random' | 'fixed' | 'countdown';
  targets?: number[];
  shotsPerTarget?: number;
  minYards?: number;
  maxYards?: number;
}

// ============================================================
// Practice session (DB row)
// ============================================================

export interface PracticeSession {
  id: string;
  user_id: string;
  mode: PracticeMode;
  program_id: string | null;
  category: DrillCategory | null;
  drill_id: string | null;
  location: PracticeLocation | null;
  plan: SessionPlan | null;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface SessionPlan {
  title: string;
  explanation?: string;
  warmup?: PlanBlock;
  blocks: PlanBlock[];
  totalMinutes: number;
}

export interface PlanBlock {
  name: string;
  drillId?: string;
  minutes: number;
  description: string;
  clubs?: string[];
  targets?: number[];
  shotsPerTarget?: number;
  reps?: number;
}

// ============================================================
// Practice shot (DB row)
// ============================================================

export interface PracticeShot {
  id: string;
  practice_session_id: string;
  timestamp: string;
  club_name: string;
  club_type: string;
  target_distance_yd: number;
  carry_distance_yd: number;
  lateral_yd: number | null;
  is_mishit: boolean;
  computed: {
    error: number;
    leaveDistance: number;
    sg: number;
    points: number;
  } | null;
  tags: string[] | null;
}

// ============================================================
// Random practice generator input/output
// ============================================================

export interface RandomPracticeInput {
  availableMinutes: number;
  location: PracticeLocation;
  recentSessions?: PracticeSession[];
  recentShots?: PracticeShot[];
}

// ============================================================
// Drill-by-time input
// ============================================================

export interface DrillByTimeInput {
  category: DrillCategory;
  minutes: number;
  clubs?: string[];
  location: PracticeLocation;
}

// ============================================================
// Active session state (client-only, not in DB)
// ============================================================

export interface ActiveSessionState {
  sessionId: string;
  mode: PracticeMode;
  plan: SessionPlan;
  currentBlockIndex: number;
  currentTargetIndex: number;
  currentShotInTarget: number;
  shots: PracticeShot[];
  startedAt: number; // Date.now()
  timerSeconds: number; // elapsed
  isComplete: boolean;
}
