// ============================================================
// Core domain types for Dispersion Lab
// ============================================================

export interface Session {
  id: string;
  user_id: string;
  name: string;
  imported_at: string;
  played_at: string | null;
  location_text: string | null;
  lat: number | null;
  lon: number | null;
  environment: EnvironmentConditions | null;
  notes: string | null;
}

export interface Shot {
  id: string;
  session_id: string;
  datetime: string | null;
  club_name: string;
  club_type: string;
  carry_distance_yd: number;
  carry_lateral_yd: number;
  total_distance_yd: number;
  total_lateral_yd: number;
  is_full_shot: boolean;
  target_distance_yd: number | null;
  tags: string[];
  notes: string | null;
  raw: Record<string, unknown> | null;
}

export interface EnvironmentConditions {
  elevationFt: number;
  temperatureF: number;
  relativeHumidityPct: number;
  pressureInHg?: number;
}

export interface ClubStats {
  clubName: string;
  clubType: string;
  n: number;
  carry: DistributionStats;
  total: DistributionStats;
  targetStats?: TargetStats;
}

export interface DistributionStats {
  meanDistance: number;
  meanLateral: number;
  sdDistance: number;
  sdLateral: number;
  covariance: number;
  medianDistance: number;
  p10Distance: number;
  p20Distance: number;
  p80Distance: number;
  p90Distance: number;
  ellipse1Sigma: EllipseParams;
  ellipse2Sigma: EllipseParams;
  patternArea1Sigma: number;
  patternArea2Sigma: number;
}

export interface EllipseParams {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotation: number; // radians
}

export interface TargetStats {
  targetDistance: number;
  meanError: number;
  sdError: number;
  pctWithin5: number;
  pctWithin10: number;
  pctWithin15: number;
}

export interface Recommendation {
  priority: number;
  clubName: string;
  issue: string;
  metric: string;
  value: number;
  threshold: number;
  suggestion: string;
}

export interface PracticePlan {
  title: string;
  duration: string;
  drills: { name: string; description: string; duration: string }[];
}

export interface YardageCardClub {
  clubName: string;
  clubType: string;
  carryRange: [number, number];
  totalRange: [number, number];
  tendency: number; // mean lateral yards, positive = right
  tendencyLabel: string;
  confidence: 'Low' | 'Med' | 'High';
  n: number;
  gapToNext?: number;
}

export interface YardageCardConfig {
  scope: 'all-time' | 'rolling' | 'selected' | 'single';
  rollingN: number;
  sessionIds: string[];
  fullShotsOnly: boolean;
  includedClubs: string[];
  percentileBand: 'P20-P80' | 'P10-P90';
  showGaps: boolean;
  showTendency: boolean;
  showConfidence: boolean;
  minShotThreshold: number;
  includeLowConfidence: boolean;
  environment?: EnvironmentConditions | null;
  distanceMode: 'observed' | 'normalized' | 'simulated';
}

export type ShotFilter = {
  fullShotsOnly: boolean;
  includePartials: boolean;
  onlyWithTargets: boolean;
  targetWindow: number | null; // +/- yards from target
  clubNames?: string[];
  sessionIds?: string[];
  tags?: string[];
};

export const DEFAULT_FILTER: ShotFilter = {
  fullShotsOnly: true,
  includePartials: false,
  onlyWithTargets: false,
  targetWindow: null,
};

export const CLUB_ORDER: Record<string, number> = {
  'Driver': 1,
  'D': 1,
  '3 Wood': 2,
  '3W': 2,
  '5 Wood': 3,
  '5W': 3,
  '7 Wood': 4,
  '7W': 4,
  '3 Hybrid': 5,
  '3H': 5,
  '4 Hybrid': 6,
  '4H': 6,
  '5 Hybrid': 7,
  '5H': 7,
  '2 Iron': 8,
  '2I': 8,
  '3 Iron': 9,
  '3I': 9,
  '4 Iron': 10,
  '4I': 10,
  '5 Iron': 11,
  '5I': 11,
  '6 Iron': 12,
  '6I': 12,
  '7 Iron': 13,
  '7I': 13,
  '8 Iron': 14,
  '8I': 14,
  '9 Iron': 15,
  '9I': 15,
  'PW': 16,
  'Pitching Wedge': 16,
  'GW': 17,
  'Gap Wedge': 17,
  'AW': 17,
  'SW': 18,
  'Sand Wedge': 18,
  'LW': 19,
  'Lob Wedge': 19,
  '46': 16,
  '48': 16.5,
  '50': 17,
  '52': 17.5,
  '54': 18,
  '56': 18.5,
  '58': 19,
  '60': 19.5,
  '62': 20,
  '64': 20.5,
};

// ============================================================
// Putter comparison types
// ============================================================

export interface Putter {
  id: string;
  user_id: string;
  name: string;
  length_in: number | null;
  lie_angle_deg: number | null;
  loft_deg: number | null;
  neck_type: string | null;
  grip: string | null;
  swing_weight: string | null;
  notes: string | null;
  created_at: string;
}

export interface PutterTest {
  id: string;
  putter_id: string;
  test_date: string;
  drill: string;
  distance_ft: number | null;
  made: number;
  attempted: number;
  notes: string | null;
  created_at: string;
}

export const PUTTER_DRILLS = [
  '3ft Straight',
  '4ft Straight',
  '5ft Straight',
  '6ft Straight',
  '8ft Straight',
  '10ft Straight',
  '15ft Lag',
  '20ft Lag',
  '30ft Lag',
  '3ft Breaking',
  '6ft Breaking',
  '10ft Breaking',
  'Gate Drill',
  'Clock Drill',
  'Speed Control',
  'Devil Ball',
  'Other',
] as const;

export function sortClubs(clubs: string[]): string[] {
  return [...clubs].sort((a, b) => {
    const orderA = CLUB_ORDER[a] ?? 50;
    const orderB = CLUB_ORDER[b] ?? 50;
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });
}
