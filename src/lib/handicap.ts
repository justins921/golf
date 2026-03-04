// ============================================================
// WHS Handicap Index calculation
// ============================================================
//
// World Handicap System (WHS) rules:
// - Score Differential = (113 / Slope) * (Adjusted Gross Score - Course Rating)
// - Handicap Index = average of best N differentials from last 20 rounds
//   Rounds | Best N used
//   3      | 1 - 2.0
//   4      | 1 - 1.0
//   5      | 1 - 0.0
//   6      | 2 - 1.0
//   7-8    | 2 - 0.0
//   9-11   | 3 - 0.0
//   12-14  | 4 - 0.0
//   15-16  | 5 - 0.0
//   17-18  | 6 - 0.0
//   19     | 7 - 0.0
//   20     | 8 - 0.0

import type { Round } from './types';

export interface ScoreDifferential {
  roundId: string;
  roundDate: string;
  courseName: string;
  score: number;
  courseRating: number;
  slopeRating: number;
  differential: number;
  used: boolean; // whether this differential is used in HI calculation
}

export interface HandicapResult {
  index: number | null;
  differentials: ScoreDifferential[];
  numUsed: number;
  adjustment: number; // the WHS adjustment subtracted
  roundsWithRating: number;
  totalScoredRounds: number;
}

// WHS lookup: [maxRounds, bestN, adjustment]
const WHS_TABLE: [number, number, number][] = [
  [3, 1, 2.0],
  [4, 1, 1.0],
  [5, 1, 0.0],
  [6, 2, 1.0],
  [8, 2, 0.0],
  [11, 3, 0.0],
  [14, 4, 0.0],
  [16, 5, 0.0],
  [18, 6, 0.0],
  [19, 7, 0.0],
  [20, 8, 0.0],
];

function getWhsParams(count: number): { bestN: number; adjustment: number } {
  for (const [maxRounds, bestN, adjustment] of WHS_TABLE) {
    if (count <= maxRounds) return { bestN, adjustment };
  }
  return { bestN: 8, adjustment: 0 };
}

export function computeDifferential(score: number, courseRating: number, slopeRating: number): number {
  return (113 / slopeRating) * (score - courseRating);
}

export function calculateHandicap(rounds: Round[]): HandicapResult {
  const scored = rounds.filter((r) => r.total_score != null && r.holes_played >= 18);
  const totalScoredRounds = scored.length;

  // Rounds with proper course/slope ratings
  const withRating = scored.filter((r) => r.course_rating != null && r.slope_rating != null);

  if (withRating.length < 3) {
    // Not enough rated rounds — fall back to estimated handicap
    return {
      index: estimateHandicap(scored),
      differentials: [],
      numUsed: 0,
      adjustment: 0,
      roundsWithRating: withRating.length,
      totalScoredRounds,
    };
  }

  // Take last 20 rated rounds (sorted most recent first)
  const recent = withRating
    .sort((a, b) => b.round_date.localeCompare(a.round_date))
    .slice(0, 20);

  const differentials: ScoreDifferential[] = recent.map((r) => ({
    roundId: r.id,
    roundDate: r.round_date,
    courseName: r.course_name,
    score: r.total_score!,
    courseRating: r.course_rating!,
    slopeRating: r.slope_rating!,
    differential: Math.round(computeDifferential(r.total_score!, r.course_rating!, r.slope_rating!) * 10) / 10,
    used: false,
  }));

  const { bestN, adjustment } = getWhsParams(differentials.length);

  // Sort by differential ascending to find best N
  const sorted = [...differentials].sort((a, b) => a.differential - b.differential);
  const usedIds = new Set(sorted.slice(0, bestN).map((d) => d.roundId));

  for (const d of differentials) {
    d.used = usedIds.has(d.roundId);
  }

  const bestDiffs = sorted.slice(0, bestN);
  const avg = bestDiffs.reduce((s, d) => s + d.differential, 0) / bestDiffs.length;
  const index = Math.max(0, Math.round((avg - adjustment) * 10) / 10);

  return {
    index,
    differentials,
    numUsed: bestN,
    adjustment,
    roundsWithRating: withRating.length,
    totalScoredRounds,
  };
}

// Fallback estimate when course ratings aren't available
function estimateHandicap(rounds: Round[]): number | null {
  if (rounds.length === 0) return null;
  const recent = rounds.slice(0, 20);
  const diffs = recent.map((r) => (r.total_score! - 72) * 0.96);
  diffs.sort((a, b) => a - b);
  const bestN = Math.max(1, Math.min(8, Math.floor(diffs.length * 0.4)));
  const avg = diffs.slice(0, bestN).reduce((s, d) => s + d, 0) / bestN;
  return Math.max(0, Math.round(avg * 10) / 10);
}
