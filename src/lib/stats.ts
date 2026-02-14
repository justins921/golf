import type { Shot, ClubStats, DistributionStats, EllipseParams, TargetStats, ShotFilter } from './types';

// ============================================================
// Filtering
// ============================================================

export function filterShots(shots: Shot[], filter: ShotFilter): Shot[] {
  return shots.filter((s) => {
    if (filter.fullShotsOnly && !s.is_full_shot) return false;
    if (!filter.includePartials && !s.is_full_shot) return false;
    if (filter.onlyWithTargets && s.target_distance_yd == null) return false;
    if (filter.targetWindow != null && s.target_distance_yd != null) {
      if (Math.abs(s.carry_distance_yd - s.target_distance_yd) > filter.targetWindow) return false;
    }
    if (filter.clubNames && filter.clubNames.length > 0) {
      if (!filter.clubNames.includes(s.club_name)) return false;
    }
    if (filter.sessionIds && filter.sessionIds.length > 0) {
      if (!filter.sessionIds.includes(s.session_id)) return false;
    }
    if (filter.tags && filter.tags.length > 0) {
      if (!filter.tags.some((t) => s.tags.includes(t))) return false;
    }
    return true;
  });
}

// ============================================================
// Percentiles & basic stats
// ============================================================

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sd(arr: number[], mu: number): number {
  if (arr.length < 2) return 0;
  const variance = arr.reduce((sum, v) => sum + (v - mu) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function covariance(xs: number[], ys: number[], muX: number, muY: number): number {
  if (xs.length < 2) return 0;
  let sum = 0;
  for (let i = 0; i < xs.length; i++) {
    sum += (xs[i] - muX) * (ys[i] - muY);
  }
  return sum / (xs.length - 1);
}

// ============================================================
// Ellipse via eigen decomposition of 2x2 covariance matrix
// ============================================================

interface Eigen2D {
  lambda1: number;
  lambda2: number;
  angle: number; // rotation in radians
}

function eigenDecomp2x2(sxx: number, sxy: number, syy: number): Eigen2D {
  const trace = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  const disc = Math.sqrt(Math.max(0, (trace * trace) / 4 - det));
  const lambda1 = trace / 2 + disc;
  const lambda2 = Math.max(0, trace / 2 - disc);

  let angle = 0;
  if (sxy !== 0) {
    angle = Math.atan2(lambda1 - sxx, sxy);
  } else if (syy > sxx) {
    angle = Math.PI / 2;
  }

  return { lambda1, lambda2, angle };
}

export function computeEllipse(
  sxx: number,
  sxy: number,
  syy: number,
  cx: number,
  cy: number,
  nSigma: number
): EllipseParams {
  const { lambda1, lambda2, angle } = eigenDecomp2x2(sxx, sxy, syy);
  return {
    cx,
    cy,
    rx: nSigma * Math.sqrt(lambda1),
    ry: nSigma * Math.sqrt(lambda2),
    rotation: angle,
  };
}

function computeDistributionStats(
  distances: number[],
  laterals: number[]
): DistributionStats {
  const muD = mean(distances);
  const muL = mean(laterals);
  const sdD = sd(distances, muD);
  const sdL = sd(laterals, muL);
  const cov = covariance(laterals, distances, muL, muD);

  const sortedDist = [...distances].sort((a, b) => a - b);

  // Covariance matrix: [[sdL^2, cov], [cov, sdD^2]]
  // X axis = lateral, Y axis = distance
  const sxx = sdL * sdL;
  const syy = sdD * sdD;
  const sxy = cov;

  const e1 = computeEllipse(sxx, sxy, syy, muL, muD, 1);
  const e2 = computeEllipse(sxx, sxy, syy, muL, muD, 2);

  return {
    meanDistance: muD,
    meanLateral: muL,
    sdDistance: sdD,
    sdLateral: sdL,
    covariance: cov,
    medianDistance: percentile(sortedDist, 50),
    p10Distance: percentile(sortedDist, 10),
    p20Distance: percentile(sortedDist, 20),
    p80Distance: percentile(sortedDist, 80),
    p90Distance: percentile(sortedDist, 90),
    ellipse1Sigma: e1,
    ellipse2Sigma: e2,
    patternArea1Sigma: Math.PI * e1.rx * e1.ry,
    patternArea2Sigma: Math.PI * e2.rx * e2.ry,
  };
}

function computeTargetStats(shots: Shot[]): TargetStats | undefined {
  const targeted = shots.filter((s) => s.target_distance_yd != null);
  if (targeted.length === 0) return undefined;

  const errors = targeted.map((s) => s.carry_distance_yd - s.target_distance_yd!);
  const mu = mean(errors);
  const sigma = sd(errors, mu);

  const within = (threshold: number) =>
    targeted.filter((s) => Math.abs(s.carry_distance_yd - s.target_distance_yd!) <= threshold).length / targeted.length;

  return {
    targetDistance: mean(targeted.map((s) => s.target_distance_yd!)),
    meanError: mu,
    sdError: sigma,
    pctWithin5: within(5),
    pctWithin10: within(10),
    pctWithin15: within(15),
  };
}

// ============================================================
// Main: compute stats per club
// ============================================================

export function computeClubStats(shots: Shot[]): ClubStats[] {
  const byClub = new Map<string, Shot[]>();
  for (const s of shots) {
    const existing = byClub.get(s.club_name) ?? [];
    existing.push(s);
    byClub.set(s.club_name, existing);
  }

  const results: ClubStats[] = [];
  for (const [clubName, clubShots] of byClub) {
    if (clubShots.length === 0) continue;
    const clubType = clubShots[0].club_type;
    const carryD = clubShots.map((s) => s.carry_distance_yd);
    const carryL = clubShots.map((s) => s.carry_lateral_yd);
    const totalD = clubShots.map((s) => s.total_distance_yd);
    const totalL = clubShots.map((s) => s.total_lateral_yd);

    results.push({
      clubName,
      clubType,
      n: clubShots.length,
      carry: computeDistributionStats(carryD, carryL),
      total: computeDistributionStats(totalD, totalL),
      targetStats: computeTargetStats(clubShots),
    });
  }

  return results;
}

// ============================================================
// Rolling N sessions (club-specific)
// ============================================================

export function getClubSpecificSessions(
  allShots: Shot[],
  clubName: string,
  sessions: { id: string; played_at: string | null }[],
  n: number
): { sessionIds: string[]; totalSessions: number; totalShots: number } {
  // Sort sessions by date descending
  const sorted = [...sessions].sort((a, b) => {
    const da = a.played_at ?? '';
    const db = b.played_at ?? '';
    return db.localeCompare(da);
  });

  // Find sessions that contain this club
  const sessionsWithClub = sorted.filter((s) =>
    allShots.some((shot) => shot.session_id === s.id && shot.club_name === clubName)
  );

  const selected = sessionsWithClub.slice(0, n);
  const selectedIds = new Set(selected.map((s) => s.id));
  const shotsInScope = allShots.filter(
    (s) => s.club_name === clubName && selectedIds.has(s.session_id)
  );

  return {
    sessionIds: selected.map((s) => s.id),
    totalSessions: selected.length,
    totalShots: shotsInScope.length,
  };
}

// ============================================================
// Is a point outside the 2σ ellipse?
// ============================================================

export function isOutlier(
  lateral: number,
  distance: number,
  ellipse: EllipseParams
): boolean {
  const cos = Math.cos(-ellipse.rotation);
  const sin = Math.sin(-ellipse.rotation);
  const dx = lateral - ellipse.cx;
  const dy = distance - ellipse.cy;
  const x = cos * dx - sin * dy;
  const y = sin * dx + cos * dy;
  if (ellipse.rx === 0 || ellipse.ry === 0) return false;
  return (x * x) / (ellipse.rx * ellipse.rx) + (y * y) / (ellipse.ry * ellipse.ry) > 1;
}

// ============================================================
// Trimmed mean (stock carry)
// ============================================================

export function trimmedMean(values: number[], trimPct: number = 0.1): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * trimPct);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
  if (trimmed.length === 0) return mean(sorted);
  return mean(trimmed);
}

// Re-export percentile for use in yardage card
export { percentile, mean, sd };
