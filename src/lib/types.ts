// ============================================================
// Core domain types for The Golf Lab
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
  dispersionArc: number;     // total lateral spread in yards (P10-P90)
  dispersionLeft: number;    // yards left of center (positive number)
  dispersionRight: number;   // yards right of center (positive number)
  dispersionBias: 'L' | 'R' | 'C'; // which direction has more spread
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
  showDispersionArc: boolean;
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

export interface DrillInfo {
  name: string;
  description: string;
  setup: string;
  focus: string;
  spaceNeeded: 'small' | 'medium' | 'large';
  defaultAttempts: number;
  defaultDistanceFt: number | null;
}

export const DRILL_INFO: Record<string, DrillInfo> = {
  '3ft Straight': {
    name: '3ft Straight',
    description: 'Putt from 3 feet on a straight line. These are the confidence-builders — you should be making nearly all of these.',
    setup: 'Place a ball 3 feet from the hole on a flat, straight section of your putting surface.',
    focus: 'Consistent setup alignment, square face at impact, and a smooth pendulum stroke.',
    spaceNeeded: 'small',
    defaultAttempts: 10,
    defaultDistanceFt: 3,
  },
  '4ft Straight': {
    name: '4ft Straight',
    description: 'Putt from 4 feet on a straight line. This is the "must-make" range on the course — the par-saving distance.',
    setup: 'Place a ball 4 feet from the hole on a flat, straight line.',
    focus: 'Start line accuracy. Pick a spot on your line and roll the ball over it every time.',
    spaceNeeded: 'small',
    defaultAttempts: 10,
    defaultDistanceFt: 4,
  },
  '5ft Straight': {
    name: '5ft Straight',
    description: 'Putt from 5 feet on a straight line. Tour make rate drops below 75% here — this is where practice pays off.',
    setup: 'Place a ball 5 feet from the hole on a straight, flat putt.',
    focus: 'Committing to your read and trusting your stroke. No steering.',
    spaceNeeded: 'small',
    defaultAttempts: 10,
    defaultDistanceFt: 5,
  },
  '6ft Straight': {
    name: '6ft Straight',
    description: 'Putt from 6 feet on a straight line. A strong 6-footer percentage separates single-digit handicaps.',
    setup: 'Place a ball 6 feet from the hole on a flat, straight section.',
    focus: 'Speed control paired with start line. Ball should die at the hole, not race past.',
    spaceNeeded: 'small',
    defaultAttempts: 10,
    defaultDistanceFt: 6,
  },
  '8ft Straight': {
    name: '8ft Straight',
    description: 'Putt from 8 feet on a straight line. At this range, a 50% make rate is strong for amateurs.',
    setup: 'Place a ball 8 feet from the hole on a flat, straight line.',
    focus: 'Rhythm and tempo. Let the length of your backstroke control distance, not hand speed.',
    spaceNeeded: 'medium',
    defaultAttempts: 10,
    defaultDistanceFt: 8,
  },
  '10ft Straight': {
    name: '10ft Straight',
    description: 'Putt from 10 feet on a straight line. Focus on getting the ball to die at the hole — speed is everything here.',
    setup: 'Place a ball 10 feet from the hole on a straight line.',
    focus: 'Speed control. The ball should just trickle past the hole if it misses, not fly 3 feet by.',
    spaceNeeded: 'medium',
    defaultAttempts: 10,
    defaultDistanceFt: 10,
  },
  '15ft Lag': {
    name: '15ft Lag',
    description: 'Lag putt from 15 feet. The goal is leaving the ball within a 2-foot circle around the hole — two-putt territory.',
    setup: 'Place a ball 15 feet from the hole. Mark a 2-foot circle around the hole if possible.',
    focus: 'Distance control over direction. Feel the weight of the putt in your backstroke.',
    spaceNeeded: 'medium',
    defaultAttempts: 10,
    defaultDistanceFt: 15,
  },
  '20ft Lag': {
    name: '20ft Lag',
    description: 'Lag putt from 20 feet. Leave the ball within a 3-foot circle to guarantee the two-putt.',
    setup: 'Place a ball 20 feet from the hole. Count "made" if the ball stops within 3 feet of the hole.',
    focus: 'Feel and touch. Use your eyes to judge the distance, then trust your body to match it.',
    spaceNeeded: 'large',
    defaultAttempts: 10,
    defaultDistanceFt: 20,
  },
  '30ft Lag': {
    name: '30ft Lag',
    description: 'Lag putt from 30 feet. This is three-putt elimination territory — leave it close and walk away with par.',
    setup: 'Place a ball 30 feet from the hole. Count "made" if the ball stops within 3 feet of the hole.',
    focus: 'Big-muscle putting. Use your shoulders and core, not your wrists, to move the putter.',
    spaceNeeded: 'large',
    defaultAttempts: 10,
    defaultDistanceFt: 30,
  },
  '3ft Breaking': {
    name: '3ft Breaking',
    description: 'Putt from 3 feet with break. Short breakers are scary on the course — build confidence here.',
    setup: 'Find a spot 3 feet from the hole with left-to-right or right-to-left break. On a mat, place a small object to create a visual break line.',
    focus: 'Read the break, pick your start line, and commit. Do not steer the putter — trust your read.',
    spaceNeeded: 'small',
    defaultAttempts: 10,
    defaultDistanceFt: 3,
  },
  '6ft Breaking': {
    name: '6ft Breaking',
    description: 'Putt from 6 feet with break. Practice reading slopes and committing to your start line.',
    setup: 'Find a spot 6 feet from the hole with noticeable break. On a mat, aim at a coin or tee placed on your intended start line.',
    focus: 'Start line and speed together. Too fast and it won\'t break enough, too slow and it breaks too much.',
    spaceNeeded: 'small',
    defaultAttempts: 10,
    defaultDistanceFt: 6,
  },
  '10ft Breaking': {
    name: '10ft Breaking',
    description: 'Putt from 10 feet with break. Combines speed control with green reading — a high-level drill.',
    setup: 'Find a spot 10 feet from the hole with break. On a mat, set up an offset target to aim at.',
    focus: 'Visualization. See the ball curving into the hole before you putt. Match speed to the break amount.',
    spaceNeeded: 'medium',
    defaultAttempts: 10,
    defaultDistanceFt: 10,
  },
  'Gate Drill': {
    name: 'Gate Drill',
    description: 'Place two tees just wider than your putter head, 1-2 feet in front of the ball. Putt through the gate to train your start line.',
    setup: 'Set 2 tees about 1 inch wider than your putter head, 12-18 inches in front of your ball. Putt from 5-6 feet through the gate into the hole.',
    focus: 'Start line accuracy. If the ball goes through the gate cleanly, your face angle and path are solid.',
    spaceNeeded: 'small',
    defaultAttempts: 10,
    defaultDistanceFt: 5,
  },
  'Clock Drill': {
    name: 'Clock Drill',
    description: 'Place balls in a circle around the hole like a clock face. Work your way around, seeing different break angles from every position.',
    setup: 'Place 4 to 12 balls in a circle around the hole at a set distance (3-6 feet). Work clockwise. If you miss, start over (optional pressure mode).',
    focus: 'Adaptability. Every putt is slightly different — you have to read and adjust for each one.',
    spaceNeeded: 'medium',
    defaultAttempts: 12,
    defaultDistanceFt: 4,
  },
  'Speed Control': {
    name: 'Speed Control',
    description: 'Putt to a target line (no hole) from various distances. Pure speed control work — the most transferable putting skill.',
    setup: 'Lay a club, string, or towel across the green/mat as a target line. Putt from 10, 15, 20, and 30 feet. Count "made" if the ball stops within 1 foot of the line.',
    focus: 'Take the hole out of the equation. All feel, all touch. This trains your subconscious distance sense.',
    spaceNeeded: 'medium',
    defaultAttempts: 10,
    defaultDistanceFt: null,
  },
  'Devil Ball': {
    name: 'Devil Ball',
    description: 'Putt 3 balls from a set distance. If you miss any, start your count over from zero. Builds clutch putting under pressure.',
    setup: 'Pick a distance (3-6 feet). Putt 3 balls. If you make all 3, your "made" count goes up by 3. If you miss any of the 3, reset your running total to 0. Try to reach 9 or 12.',
    focus: 'Pressure management. The last ball of each set simulates a must-make putt on the course.',
    spaceNeeded: 'small',
    defaultAttempts: 12,
    defaultDistanceFt: 4,
  },
  'Other': {
    name: 'Other',
    description: 'Custom drill — describe what you\'re working on in the notes field.',
    setup: 'Set up whatever drill you like.',
    focus: 'Whatever aspect of your putting you want to improve.',
    spaceNeeded: 'small',
    defaultAttempts: 10,
    defaultDistanceFt: null,
  },
};

export function sortClubs(clubs: string[]): string[] {
  return [...clubs].sort((a, b) => {
    const orderA = CLUB_ORDER[a] ?? 50;
    const orderB = CLUB_ORDER[b] ?? 50;
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });
}

// ============================================================
// Bag club types
// ============================================================

export interface BagClub {
  id: string;
  user_id: string;
  club_name: string;
  brand: string | null;
  model: string | null;
  loft_deg: number | null;
  shaft: string | null;
  flex: string | null;
  notes: string | null;
  created_at: string;
}

// ============================================================
// Wedge matrix types
// ============================================================

export type SwingSystem = 'clock' | 'percentage' | 'body' | 'thirds' | 'custom';

export const SWING_SYSTEM_LABELS: Record<SwingSystem, string> = {
  clock: 'Clock System',
  percentage: 'Percentage',
  body: 'Body Reference',
  thirds: 'Thirds',
  custom: 'Custom',
};

export const SWING_SYSTEM_PRESETS: Record<SwingSystem, string[]> = {
  clock: ['7:30', '9:00', '10:30'],
  percentage: ['50%', '75%', '100%'],
  body: ['Hips', 'Chest', 'Full'],
  thirds: ['1/3', '2/3', 'Full'],
  custom: [],
};

export const WEDGE_CLUB_PRESETS = ['PW', 'GW', 'SW', 'LW'] as const;

export interface WedgeMatrix {
  id: string;
  user_id: string;
  swing_system: SwingSystem;
  swing_labels: string[];
  wedge_clubs: string[];
  distances: Record<string, number>; // "PW|9:00" -> 85
  notes: string | null;
  created_at: string;
}
