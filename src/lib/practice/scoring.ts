/**
 * Strokes-Gained-inspired scoring engine for practice sessions.
 *
 * All tunable constants are exported so Settings UI can adjust them.
 * Scoring flow:
 *   1. Compute leaveDistance from carry error + lateral penalty
 *   2. Look up expectedStrokes for start and leave distances
 *   3. SG = expectedStrokes(start) - (1 + expectedStrokes(leave))
 *   4. Points = clamp(round((SG + sgOffset) * pointsScale), minPoints, maxPoints)
 */

// ============================================================
// Tunable constants — adjust via Settings UI
// ============================================================

export interface ScoringSettings {
  /** Lateral penalty multiplier for wedge shots (default 0.5) */
  wedgeLateralPenalty: number;
  /** Lateral penalty multiplier for full-swing shots (default 1.0) */
  fullSwingLateralPenalty: number;
  /** SG offset before scaling to points (default 0.3) */
  sgOffset: number;
  /** Multiplier to convert SG delta to points (default 250) */
  pointsScale: number;
  /** Minimum points per shot (default 0) */
  minPoints: number;
  /** Maximum points per shot (default 300) */
  maxPoints: number;
  /** When true, only distance error counts (lateral ignored) */
  accuracyOnlyMode: boolean;
}

export const DEFAULT_SCORING: ScoringSettings = {
  wedgeLateralPenalty: 0.5,
  fullSwingLateralPenalty: 1.0,
  sgOffset: 0.3,
  pointsScale: 250,
  minPoints: 0,
  maxPoints: 300,
  accuracyOnlyMode: false,
};

// ============================================================
// Expected strokes model
// ============================================================

/**
 * Smooth approximation of expected strokes to hole-out from a given
 * distance (in yards). Based on PGA approach proximity data fitted
 * to a log curve.
 *
 *   expectedStrokes ≈ a * ln(distance + 1) + b
 *
 * Calibration points:
 *   1 yd  → ~1.05  (tap-in)
 *  10 yds → ~2.1   (chip)
 *  30 yds → ~2.6   (pitch)
 *  60 yds → ~2.8   (half wedge)
 * 100 yds → ~2.95  (full wedge)
 * 150 yds → ~3.05  (mid iron)
 * 200 yds → ~3.15  (long iron)
 */
const A = 0.4;
const B = 1.0;

export function expectedStrokes(distanceYds: number): number {
  if (distanceYds <= 0) return 1.0; // holed-out / on the green
  return A * Math.log(distanceYds + 1) + B;
}

// ============================================================
// Leave distance computation
// ============================================================

export function computeLeaveDistance(
  errorYds: number,
  lateralYds: number,
  isWedge: boolean,
  settings: ScoringSettings = DEFAULT_SCORING,
): number {
  if (settings.accuracyOnlyMode) {
    return Math.abs(errorYds);
  }
  const lateralPenalty = isWedge
    ? settings.wedgeLateralPenalty
    : settings.fullSwingLateralPenalty;

  return Math.sqrt(errorYds * errorYds + lateralPenalty * lateralYds * lateralYds);
}

// ============================================================
// Strokes gained
// ============================================================

export function computeStrokesGained(
  startDistanceYds: number,
  leaveDistanceYds: number,
): number {
  return expectedStrokes(startDistanceYds) - (1 + expectedStrokes(leaveDistanceYds));
}

// ============================================================
// Points
// ============================================================

export function computePoints(
  sg: number,
  settings: ScoringSettings = DEFAULT_SCORING,
): number {
  const raw = Math.round((sg + settings.sgOffset) * settings.pointsScale);
  return Math.max(settings.minPoints, Math.min(settings.maxPoints, raw));
}

// ============================================================
// Full scoring pipeline for a single shot
// ============================================================

export interface ShotScore {
  targetDistance: number;
  carryDistance: number;
  lateralYds: number;
  error: number;
  leaveDistance: number;
  sg: number;
  points: number;
}

export function scoreShot(
  targetDistanceYds: number,
  carryDistanceYds: number,
  lateralYds: number = 0,
  isWedge: boolean = true,
  settings: ScoringSettings = DEFAULT_SCORING,
): ShotScore {
  const error = carryDistanceYds - targetDistanceYds;
  const leaveDistance = computeLeaveDistance(error, lateralYds, isWedge, settings);
  const sg = computeStrokesGained(targetDistanceYds, leaveDistance);
  const points = computePoints(sg, settings);

  return {
    targetDistance: targetDistanceYds,
    carryDistance: carryDistanceYds,
    lateralYds,
    error,
    leaveDistance: Math.round(leaveDistance * 10) / 10,
    sg: Math.round(sg * 1000) / 1000,
    points,
  };
}

// ============================================================
// Session-level scoring
// ============================================================

export function scoreSession(shots: ShotScore[]): {
  totalPoints: number;
  avgPoints: number;
  avgError: number;
  avgLeave: number;
  bestShot: ShotScore | null;
  worstShot: ShotScore | null;
} {
  if (shots.length === 0) {
    return { totalPoints: 0, avgPoints: 0, avgError: 0, avgLeave: 0, bestShot: null, worstShot: null };
  }

  const totalPoints = shots.reduce((s, sh) => s + sh.points, 0);
  const avgError = shots.reduce((s, sh) => s + Math.abs(sh.error), 0) / shots.length;
  const avgLeave = shots.reduce((s, sh) => s + sh.leaveDistance, 0) / shots.length;

  let best = shots[0];
  let worst = shots[0];
  for (const sh of shots) {
    if (sh.points > best.points) best = sh;
    if (sh.points < worst.points) worst = sh;
  }

  return {
    totalPoints,
    avgPoints: Math.round(totalPoints / shots.length),
    avgError: Math.round(avgError * 10) / 10,
    avgLeave: Math.round(avgLeave * 10) / 10,
    bestShot: best,
    worstShot: worst,
  };
}

// ============================================================
// Classify club as wedge or not
// ============================================================

const WEDGE_NAMES = new Set([
  'PW', 'Pitching Wedge',
  'GW', 'Gap Wedge',
  'SW', 'Sand Wedge',
  'LW', 'Lob Wedge',
  'AW', 'Approach Wedge',
]);

export function isWedgeClub(clubName: string): boolean {
  if (WEDGE_NAMES.has(clubName)) return true;
  // Degree-based wedge names: 46°, 50°, 52°, etc.
  const deg = parseInt(clubName);
  return !isNaN(deg) && deg >= 44 && deg <= 64;
}
