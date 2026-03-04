/**
 * Strokes Gained estimation from scorecard data.
 *
 * Uses Mark Broadie's framework adapted for hole-by-hole scorecard input
 * (no GPS/shot-level data required). Estimates SG in 4 categories:
 *   - Off the Tee (OTT)
 *   - Approach
 *   - Around the Green (Short Game)
 *   - Putting
 *
 * Benchmarks are indexed by handicap level.
 */

import type { RoundHole, Round } from './types';

// ============================================================
// Handicap benchmark data
// ============================================================

export interface HandicapBenchmark {
  label: string;
  handicapRange: [number, number];
  // Per-round expected rates
  firPct: number;           // Fairway in Regulation %
  girPct: number;           // Greens in Regulation %
  upAndDownPct: number;     // Up & Down %
  sandSavePct: number;      // Sand Save %
  puttsPerGir: number;      // Average putts when hitting GIR
  puttsPerNonGir: number;   // Average putts when missing GIR
  puttsPerRound: number;    // Total putts per 18 holes
  avgScore18: number;       // Average score for 18 holes
  // Putting by first-putt distance (expected putts)
  threePuttPctGir: number;  // 3-putt % when on GIR
  onePuttPctNonGir: number; // 1-putt % from off-green
}

export const BENCHMARKS: HandicapBenchmark[] = [
  {
    label: 'Scratch',
    handicapRange: [-2, 2],
    firPct: 68, girPct: 67, upAndDownPct: 58, sandSavePct: 48,
    puttsPerGir: 1.78, puttsPerNonGir: 1.95, puttsPerRound: 29.5, avgScore18: 72,
    threePuttPctGir: 5, onePuttPctNonGir: 25,
  },
  {
    label: '5 HI',
    handicapRange: [3, 7],
    firPct: 55, girPct: 50, upAndDownPct: 42, sandSavePct: 30,
    puttsPerGir: 1.85, puttsPerNonGir: 2.00, puttsPerRound: 31.5, avgScore18: 79,
    threePuttPctGir: 8, onePuttPctNonGir: 20,
  },
  {
    label: '10 HI',
    handicapRange: [8, 12],
    firPct: 46, girPct: 36, upAndDownPct: 30, sandSavePct: 18,
    puttsPerGir: 1.90, puttsPerNonGir: 2.10, puttsPerRound: 33.0, avgScore18: 85,
    threePuttPctGir: 12, onePuttPctNonGir: 15,
  },
  {
    label: '15 HI',
    handicapRange: [13, 17],
    firPct: 38, girPct: 25, upAndDownPct: 22, sandSavePct: 12,
    puttsPerGir: 1.95, puttsPerNonGir: 2.15, puttsPerRound: 34.5, avgScore18: 90,
    threePuttPctGir: 16, onePuttPctNonGir: 12,
  },
  {
    label: '20 HI',
    handicapRange: [18, 22],
    firPct: 32, girPct: 17, upAndDownPct: 16, sandSavePct: 8,
    puttsPerGir: 2.00, puttsPerNonGir: 2.20, puttsPerRound: 36.0, avgScore18: 95,
    threePuttPctGir: 20, onePuttPctNonGir: 10,
  },
  {
    label: '25 HI',
    handicapRange: [23, 27],
    firPct: 25, girPct: 10, upAndDownPct: 12, sandSavePct: 5,
    puttsPerGir: 2.05, puttsPerNonGir: 2.25, puttsPerRound: 37.5, avgScore18: 100,
    threePuttPctGir: 24, onePuttPctNonGir: 8,
  },
  {
    label: '30+ HI',
    handicapRange: [28, 54],
    firPct: 18, girPct: 5, upAndDownPct: 8, sandSavePct: 3,
    puttsPerGir: 2.10, puttsPerNonGir: 2.30, puttsPerRound: 39.0, avgScore18: 108,
    threePuttPctGir: 28, onePuttPctNonGir: 6,
  },
];

export function getBenchmark(handicap: number): HandicapBenchmark {
  for (const b of BENCHMARKS) {
    if (handicap >= b.handicapRange[0] && handicap <= b.handicapRange[1]) return b;
  }
  // Default to closest
  if (handicap < BENCHMARKS[0].handicapRange[0]) return BENCHMARKS[0];
  return BENCHMARKS[BENCHMARKS.length - 1];
}

// ============================================================
// Expected putts from distance (Broadie's data, amateur adjusted)
// ============================================================

/** Expected putts from a given distance in feet (Broadie/PGA Tour fitted) */
export function expectedPutts(distanceFt: number): number {
  if (distanceFt <= 0) return 0;
  if (distanceFt <= 1) return 1.0;
  // Logarithmic model: E[putts] ≈ 0.35 * ln(dist) + 1.0
  // Calibration: 3ft→1.38, 6ft→1.63, 10ft→1.81, 20ft→2.05, 30ft→2.19, 60ft→2.43
  return 0.35 * Math.log(distanceFt) + 1.0;
}

// ============================================================
// SG Analysis result types
// ============================================================

export interface HoleSG {
  holeNumber: number;
  par: number;
  score: number;
  putts: number;
  sgTotal: number;
  sgPutting: number;
  sgTeeToGreen: number;
  sgOtt: number;
  sgApproach: number;
  sgShortGame: number;
}

export interface RoundSGAnalysis {
  // Overall
  totalSG: number;
  sgPerHole: number;
  projectedScore: number; // Benchmark score for this handicap

  // Category totals
  sgOtt: number;
  sgApproach: number;
  sgShortGame: number;
  sgPutting: number;

  // Key stats
  totalPutts: number;
  puttsPerGir: number;
  puttsPerNonGir: number;
  girCount: number;
  girPct: number;
  firCount: number;
  firPct: number;
  firHoles: number; // par 4+5 count
  upAndDownAttempts: number;
  upAndDownMade: number;
  upAndDownPct: number;
  sandAttempts: number;
  sandMade: number;
  sandPct: number;
  totalPenalties: number;
  threePuttCount: number;
  onePuttCount: number;

  // Per-hole breakdown
  holes: HoleSG[];

  // Benchmark comparison
  benchmark: HandicapBenchmark;
  handicap: number;
}

// ============================================================
// Core SG estimation from scorecard data
// ============================================================

/**
 * Estimate first putt distance (in feet) based on how the green was reached.
 * GIR approach: avg ~28ft for mid-handicap, varies by approach distance.
 * Non-GIR: typically chipping on, shorter first putts ~12-18ft.
 */
function estimateFirstPuttDistance(
  gir: boolean,
  approachDistanceYd: number | null,
): number {
  if (gir) {
    if (approachDistanceYd != null) {
      // Longer approaches → further from pin on GIR
      if (approachDistanceYd > 200) return 35;
      if (approachDistanceYd > 150) return 30;
      if (approachDistanceYd > 100) return 25;
      return 20;
    }
    return 28; // default GIR first putt distance
  }
  // Non-GIR: chipping on, typically closer
  return 15;
}

/**
 * Estimate SG Putting for a single hole.
 * SG_putting = expectedPutts(firstPuttDist) - actualPutts
 */
function estimateHolePuttingSG(
  putts: number,
  gir: boolean,
  approachDistanceYd: number | null,
): number {
  const firstPuttDist = estimateFirstPuttDistance(gir, approachDistanceYd);
  const expected = expectedPutts(firstPuttDist);
  return expected - putts;
}

/**
 * Estimate SG Off the Tee for a par 4 or par 5.
 * Based on FIR status and penalties.
 *
 * Model: Hitting the fairway is worth ~0.3 strokes vs missing it (Broadie).
 * Penalty strokes on tee shots are direct -1.0 SG each.
 */
function estimateHoleOttSG(
  par: number,
  fairwayHit: boolean | null,
  penaltyStrokes: number,
  benchmark: HandicapBenchmark,
): number {
  if (par <= 3) return 0; // No tee shot SG on par 3s

  let sg = 0;

  // FIR impact: compare to benchmark expectation
  const benchmarkFirProb = benchmark.firPct / 100;
  if (fairwayHit === true) {
    // Gained relative to a player who hits fairway at benchmark rate
    sg += (1 - benchmarkFirProb) * 0.3;
  } else if (fairwayHit === false) {
    // Lost relative to benchmark
    sg -= benchmarkFirProb * 0.3;
  }
  // null = no data, assume neutral

  // Penalty on tee shot
  sg -= penaltyStrokes * 0.8; // Penalties cost ~0.8 SG (re-tee, etc.)

  return sg;
}

/**
 * Estimate SG Approach for a hole.
 * Based on whether GIR was achieved given approach distance.
 */
function estimateHoleApproachSG(
  par: number,
  gir: boolean | null,
  approachDistanceYd: number | null,
  benchmark: HandicapBenchmark,
): number {
  if (gir === null) return 0;

  const benchmarkGirProb = benchmark.girPct / 100;

  // Adjust expected GIR rate by approach distance if available
  let expectedGirRate = benchmarkGirProb;
  if (approachDistanceYd != null) {
    // Closer approaches should have higher GIR rates
    if (approachDistanceYd <= 100) expectedGirRate = Math.min(0.80, benchmarkGirProb * 1.5);
    else if (approachDistanceYd <= 150) expectedGirRate = benchmarkGirProb * 1.1;
    else if (approachDistanceYd > 200) expectedGirRate = benchmarkGirProb * 0.7;
  }

  if (gir) {
    // SG gained = (1 - expectedRate) * value_of_gir
    return (1 - expectedGirRate) * 0.5;
  } else {
    // SG lost = expectedRate * value_of_missing
    return -expectedGirRate * 0.5;
  }
}

/**
 * Estimate SG Short Game (Around the Green).
 * For non-GIR holes, based on up & down conversion.
 */
function estimateHoleShortGameSG(
  gir: boolean | null,
  upAndDown: boolean | null,
  sandSave: boolean | null,
  benchmark: HandicapBenchmark,
): number {
  // Only applies to non-GIR holes
  if (gir === true || gir === null) return 0;

  if (sandSave !== null) {
    const benchmarkSandProb = benchmark.sandSavePct / 100;
    if (sandSave) {
      return (1 - benchmarkSandProb) * 0.6;
    } else {
      return -benchmarkSandProb * 0.6;
    }
  }

  if (upAndDown !== null) {
    const benchmarkUdProb = benchmark.upAndDownPct / 100;
    if (upAndDown) {
      return (1 - benchmarkUdProb) * 0.5;
    } else {
      return -benchmarkUdProb * 0.5;
    }
  }

  return 0; // No data available
}

// ============================================================
// Main analysis function
// ============================================================

export function analyzeRound(
  round: Round,
  holes: RoundHole[],
  handicap: number = 15,
): RoundSGAnalysis {
  const benchmark = getBenchmark(handicap);
  const numHoles = holes.length || round.holes_played;

  const holeSGs: HoleSG[] = [];

  let totalPutts = 0;
  let girPutts = 0;
  let girCount = 0;
  let nonGirPutts = 0;
  let nonGirCount = 0;
  let firCount = 0;
  let firHoles = 0;
  let upAndDownAttempts = 0;
  let upAndDownMade = 0;
  let sandAttempts = 0;
  let sandMade = 0;
  let totalPenalties = 0;
  let threePuttCount = 0;
  let onePuttCount = 0;

  let sgOttTotal = 0;
  let sgApproachTotal = 0;
  let sgShortGameTotal = 0;
  let sgPuttingTotal = 0;

  for (const hole of holes) {
    const score = hole.score ?? 0;
    const putts = hole.putts ?? 0;
    const par = hole.par;
    const gir = hole.gir ?? null;
    const fir = hole.fairway_hit ?? null;
    const ud = hole.up_and_down ?? null;
    const ss = hole.sand_save ?? null;
    const penalties = hole.penalty_strokes ?? 0;
    const approachDist = hole.approach_distance_yd ?? null;

    if (score === 0) continue; // Skip unscored holes

    // Aggregate stats
    totalPutts += putts;
    totalPenalties += penalties;
    if (putts >= 3) threePuttCount++;
    if (putts === 1) onePuttCount++;

    if (par >= 4) {
      firHoles++;
      if (fir === true) firCount++;
    }

    if (gir === true) {
      girCount++;
      girPutts += putts;
    } else if (gir === false) {
      nonGirCount++;
      nonGirPutts += putts;

      // Up & down tracking
      if (ss !== null) {
        sandAttempts++;
        if (ss) sandMade++;
      } else if (ud !== null) {
        upAndDownAttempts++;
        if (ud) upAndDownMade++;
      }
    }

    // Category SG estimates
    const sgPutting = estimateHolePuttingSG(putts, gir ?? false, approachDist);
    const sgOtt = estimateHoleOttSG(par, fir, penalties, benchmark);
    const sgApproach = estimateHoleApproachSG(par, gir, approachDist, benchmark);
    const sgShortGame = estimateHoleShortGameSG(gir, ud, ss, benchmark);

    // Total SG for hole = benchmark expected score - actual score
    // Normalized to the benchmark's expected score per hole
    const expectedScorePerHole = benchmark.avgScore18 / 18;
    const sgTotal = expectedScorePerHole - (score / 1); // per hole

    sgOttTotal += sgOtt;
    sgApproachTotal += sgApproach;
    sgShortGameTotal += sgShortGame;
    sgPuttingTotal += sgPutting;

    holeSGs.push({
      holeNumber: hole.hole_number,
      par,
      score,
      putts,
      sgTotal: round2(sgTotal - (par - (benchmark.avgScore18 / 18))),
      sgPutting: round2(sgPutting),
      sgTeeToGreen: round2(sgOtt + sgApproach + sgShortGame),
      sgOtt: round2(sgOtt),
      sgApproach: round2(sgApproach),
      sgShortGame: round2(sgShortGame),
    });
  }

  const scoredHoles = holeSGs.length;
  const totalScore = holes.reduce((s, h) => s + (h.score ?? 0), 0);
  const totalPar = holes.reduce((s, h) => s + h.par, 0);

  // Scale to 18-hole equivalent
  const scale = scoredHoles > 0 ? 18 / scoredHoles : 1;
  const projectedScore = benchmark.avgScore18;

  // Total SG = benchmark - actual
  const totalSG = round2(projectedScore - (totalScore * scale));

  return {
    totalSG,
    sgPerHole: round2(totalSG / 18),
    projectedScore,

    sgOtt: round2(sgOttTotal * (scoredHoles < 18 ? scale : 1)),
    sgApproach: round2(sgApproachTotal * (scoredHoles < 18 ? scale : 1)),
    sgShortGame: round2(sgShortGameTotal * (scoredHoles < 18 ? scale : 1)),
    sgPutting: round2(sgPuttingTotal * (scoredHoles < 18 ? scale : 1)),

    totalPutts,
    puttsPerGir: girCount > 0 ? round2(girPutts / girCount) : 0,
    puttsPerNonGir: nonGirCount > 0 ? round2(nonGirPutts / nonGirCount) : 0,
    girCount,
    girPct: scoredHoles > 0 ? round1((girCount / scoredHoles) * 100) : 0,
    firCount,
    firPct: firHoles > 0 ? round1((firCount / firHoles) * 100) : 0,
    firHoles,
    upAndDownAttempts,
    upAndDownMade,
    upAndDownPct: upAndDownAttempts > 0 ? round1((upAndDownMade / upAndDownAttempts) * 100) : 0,
    sandAttempts,
    sandMade,
    sandPct: sandAttempts > 0 ? round1((sandMade / sandAttempts) * 100) : 0,
    totalPenalties,
    threePuttCount,
    onePuttCount,

    holes: holeSGs,
    benchmark,
    handicap,
  };
}

// ============================================================
// Multi-round analysis (trends)
// ============================================================

export interface RoundSummary {
  roundId: string;
  date: string;
  course: string;
  score: number;
  totalSG: number;
  sgOtt: number;
  sgApproach: number;
  sgShortGame: number;
  sgPutting: number;
}

export function analyzeMultipleRounds(
  rounds: Round[],
  holesByRound: Record<string, RoundHole[]>,
  handicap: number = 15,
): RoundSummary[] {
  return rounds
    .filter((r) => r.total_score != null)
    .map((r) => {
      const holes = holesByRound[r.id] ?? [];
      if (holes.length === 0) {
        return {
          roundId: r.id,
          date: r.round_date,
          course: r.course_name,
          score: r.total_score!,
          totalSG: 0,
          sgOtt: 0,
          sgApproach: 0,
          sgShortGame: 0,
          sgPutting: 0,
        };
      }
      const analysis = analyzeRound(r, holes, handicap);
      return {
        roundId: r.id,
        date: r.round_date,
        course: r.course_name,
        score: r.total_score!,
        totalSG: analysis.totalSG,
        sgOtt: analysis.sgOtt,
        sgApproach: analysis.sgApproach,
        sgShortGame: analysis.sgShortGame,
        sgPutting: analysis.sgPutting,
      };
    });
}

// ============================================================
// Helpers
// ============================================================

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }
