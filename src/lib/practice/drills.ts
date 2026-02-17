/**
 * Seed drill definitions and programs.
 * These are hardcoded reference data — not stored in DB.
 */

import type { PracticeDrill, PracticeProgram, PlanBlock, SessionPlan, DrillCategory, PracticeLocation } from './types';

// ============================================================
// Seed drills (~12)
// ============================================================

export const DRILLS: PracticeDrill[] = [
  {
    id: 'drill-wedge-ladder',
    name: 'Wedge Distance Ladder',
    category: 'wedges',
    description: 'Hit to ascending distance targets with each wedge. Build a reliable distance ladder.',
    defaultDurations: [15, 20, 30],
    scoringMethod: 'points',
    instructions: [
      'Start with your shortest target distance',
      'Hit the specified number of shots per target',
      'Move up to the next distance',
      'Focus on consistent carry distance, not total',
    ],
    locations: ['range', 'home_sim'],
  },
  {
    id: 'drill-random-wedge',
    name: 'Random Wedge Targets',
    category: 'wedges',
    description: 'Random distances called out — react and execute. TheStack-style randomized practice.',
    defaultDurations: [10, 15, 20],
    scoringMethod: 'points',
    instructions: [
      'A random target distance will appear',
      'Choose the right club and swing length',
      'Hit the shot and log your carry distance',
      'Score is based on proximity to target',
    ],
    locations: ['range', 'home_sim'],
  },
  {
    id: 'drill-scoring-zone',
    name: 'Scoring Zone Challenge',
    category: 'wedges',
    description: 'Focus on the 50-100 yard scoring zone. The shots that make or break your round.',
    defaultDurations: [15, 20],
    scoringMethod: 'points',
    instructions: [
      'Targets range from 50-100 yards',
      'Alternate between clubs to build versatility',
      'Track your proximity to each target',
    ],
    locations: ['range', 'home_sim'],
  },
  {
    id: 'drill-stock-shot',
    name: 'Stock Shot Repetition',
    category: 'full_swing',
    description: 'Pick one club and groove your stock shot. Track dispersion and consistency.',
    defaultDurations: [10, 15, 20],
    scoringMethod: 'points',
    instructions: [
      'Choose a single club',
      'Hit to your stock yardage',
      'Focus on repeating the same swing',
      'Track both carry and lateral dispersion',
    ],
    locations: ['range', 'home_sim'],
  },
  {
    id: 'drill-tempo-ladder',
    name: 'Tempo Ladder',
    category: 'full_swing',
    description: 'Hit 3 shots at 75%, 3 at 85%, 3 at 100%. Learn your tempo spectrum.',
    defaultDurations: [10, 15],
    scoringMethod: 'points',
    instructions: [
      'Start with 3 shots at 75% effort',
      'Then 3 shots at 85% effort',
      'Then 3 shots at 100% effort',
      'Compare dispersion patterns across tempos',
    ],
    locations: ['range', 'home_sim'],
  },
  {
    id: 'drill-lowpoint',
    name: 'Strike / Low-Point Control',
    category: 'full_swing',
    description: 'Place a towel 2 inches behind the ball. Hit without touching it. Pure ball-first contact.',
    defaultDurations: [10, 15],
    scoringMethod: 'points',
    instructions: [
      'Place a towel or tee 2 inches behind the ball',
      'Hit the ball without disturbing the towel',
      'Focus on hitting the ball then the ground',
      'Log carry distance — good strikes fly farther',
    ],
    locations: ['range', 'home_sim'],
  },
  {
    id: 'drill-start-line-gate',
    name: 'Start Line Gate',
    category: 'putting',
    description: 'Two tees just wider than your putter, 1 foot in front. Train your start line.',
    defaultDurations: [5, 10, 15],
    scoringMethod: 'make_pct',
    instructions: [
      'Set two tees ~1 inch wider than your putter head',
      'Place them 12-18 inches in front of the ball',
      'Putt through the gate 10 times',
      'Count successful passes through the gate',
    ],
    locations: ['putting_mat', 'course'],
  },
  {
    id: 'drill-lag-putting',
    name: 'Lag Putting Distance Control',
    category: 'putting',
    description: 'Long putts from 20-40 feet. Success = ending within 3 feet of the hole.',
    defaultDurations: [10, 15],
    scoringMethod: 'make_pct',
    instructions: [
      'Putt from 20, 30, and 40 feet',
      'Count as "made" if ball stops within 3 feet',
      'Focus on speed control, not line',
    ],
    locations: ['putting_mat', 'course'],
  },
  {
    id: 'drill-pressure-putting',
    name: 'Pressure Putting (Devil Ball)',
    category: 'putting',
    description: 'Make 3 in a row from 4 feet. Miss one? Start over. Builds clutch putting.',
    defaultDurations: [5, 10],
    scoringMethod: 'make_pct',
    instructions: [
      'Set up 4 feet from the hole',
      'Make 3 consecutive putts',
      'If you miss, restart your count from 0',
      'Goal: reach 9 or 12 total makes',
    ],
    locations: ['putting_mat', 'course'],
  },
  {
    id: 'drill-pitch-chip',
    name: 'Pitch & Chip Proximity',
    category: 'short_game',
    description: 'Hit pitches/chips from various distances. Score based on how close to the hole.',
    defaultDurations: [10, 15, 20],
    scoringMethod: 'proximity',
    instructions: [
      'Set up at 10, 20, and 30 yards',
      'Hit 3-5 shots from each distance',
      'Score based on proximity to the target',
    ],
    locations: ['range', 'course'],
  },
  {
    id: 'drill-bunker-escape',
    name: 'Bunker Escape Rate',
    category: 'short_game',
    description: 'Get out of the bunker and on the green in one shot. Track your escape rate.',
    defaultDurations: [10, 15],
    scoringMethod: 'make_pct',
    instructions: [
      'Set up in a greenside bunker',
      'Hit 10 shots aiming for the green',
      'Count how many land on the putting surface',
      '"Made" = ball is on the green',
    ],
    locations: ['range', 'course'],
  },
  {
    id: 'drill-9shot',
    name: '9-Shot Flight Drill',
    category: 'full_swing',
    description: 'Hit high/mid/low x draw/straight/fade. Master your shot shapes.',
    defaultDurations: [15, 20, 30],
    scoringMethod: 'points',
    instructions: [
      'Pick one club (7-iron recommended)',
      'Hit 9 shots: 3 trajectories x 3 shapes',
      'Low draw, low straight, low fade',
      'Mid draw, mid straight, mid fade',
      'High draw, high straight, high fade',
    ],
    locations: ['range', 'home_sim'],
  },
];

export function getDrillById(id: string): PracticeDrill | undefined {
  return DRILLS.find((d) => d.id === id);
}

export function getDrillsByCategory(category: DrillCategory): PracticeDrill[] {
  if (category === 'random') return DRILLS;
  return DRILLS.filter((d) => d.category === category);
}

export function getDrillsForLocation(location: PracticeLocation): PracticeDrill[] {
  return DRILLS.filter((d) => d.locations.includes(location));
}

// ============================================================
// Seed programs
// ============================================================

export const PROGRAMS: PracticeProgram[] = [
  {
    id: 'prog-wedge-ladder',
    name: 'Wedge Distance Ladder',
    category: 'wedges',
    description: 'Build a reliable wedge distance ladder from 30-100 yards. 3 shots per target, scored on proximity.',
  },
  {
    id: 'prog-full-bag',
    name: 'Full Bag Workout',
    category: 'full_swing',
    description: 'Work through your entire bag from wedges to driver. 5 shots per club, focus on stock yardages.',
  },
  {
    id: 'prog-scoring',
    name: 'Scoring Zone Mastery',
    category: 'wedges',
    description: 'Intensive work on 40-120 yard shots. The shots that lower your handicap the fastest.',
  },
];

// ============================================================
// Plan generation helpers
// ============================================================

export function buildWedgeLadderPlan(
  clubs: string[],
  targets: number[],
  shotsPerTarget: number,
): SessionPlan {
  const blocks: PlanBlock[] = clubs.map((club) => ({
    name: `${club} Ladder`,
    drillId: 'drill-wedge-ladder',
    minutes: Math.ceil((targets.length * shotsPerTarget * 30) / 60), // ~30s per shot
    description: `Hit ${shotsPerTarget} shots to each target with your ${club}`,
    clubs: [club],
    targets,
    shotsPerTarget,
  }));

  const totalMinutes = blocks.reduce((s, b) => s + b.minutes, 0);

  return {
    title: 'Wedge Distance Ladder',
    blocks,
    totalMinutes: totalMinutes + 3, // +3 for warmup
    warmup: {
      name: 'Warmup',
      minutes: 3,
      description: 'Hit 5-10 easy half swings with your shortest wedge to loosen up.',
    },
  };
}

export function buildTimeDrillPlan(
  drill: PracticeDrill,
  minutes: number,
  clubs?: string[],
): SessionPlan {
  const block: PlanBlock = {
    name: drill.name,
    drillId: drill.id,
    minutes: minutes > 10 ? minutes - 3 : minutes,
    description: drill.description,
    clubs,
  };

  const warmup: PlanBlock | undefined = minutes > 10 ? {
    name: 'Warmup',
    minutes: 3,
    description: 'Hit a few easy swings to get loose.',
  } : undefined;

  return {
    title: drill.name,
    blocks: [block],
    totalMinutes: minutes,
    warmup,
  };
}

export function buildRandomPlan(
  minutes: number,
  location: PracticeLocation,
  weakAreas?: { category: DrillCategory; reason: string }[],
): SessionPlan {
  const available = getDrillsForLocation(location);
  if (available.length === 0) {
    return {
      title: 'Random Practice',
      explanation: 'No drills available for this location.',
      blocks: [],
      totalMinutes: minutes,
    };
  }

  const warmupMin = minutes >= 20 ? 5 : minutes >= 10 ? 3 : 0;
  let remaining = minutes - warmupMin;

  // Pick drills based on weak areas or random selection
  const blocks: PlanBlock[] = [];
  const usedDrills = new Set<string>();

  // If we have weak areas, prioritize those
  if (weakAreas && weakAreas.length > 0) {
    for (const area of weakAreas) {
      if (remaining <= 0) break;
      const categoryDrills = available.filter(
        (d) => d.category === area.category && !usedDrills.has(d.id)
      );
      if (categoryDrills.length === 0) continue;

      const drill = categoryDrills[Math.floor(Math.random() * categoryDrills.length)];
      usedDrills.add(drill.id);

      const blockMin = Math.min(remaining, Math.max(10, Math.floor(remaining / 2)));
      blocks.push({
        name: drill.name,
        drillId: drill.id,
        minutes: blockMin,
        description: `${drill.description} (Focus: ${area.reason})`,
      });
      remaining -= blockMin;
    }
  }

  // Fill remaining time with random drills
  while (remaining >= 5) {
    const pool = available.filter((d) => !usedDrills.has(d.id));
    if (pool.length === 0) break;

    const drill = pool[Math.floor(Math.random() * pool.length)];
    usedDrills.add(drill.id);

    const blockMin = Math.min(remaining, 15);
    blocks.push({
      name: drill.name,
      drillId: drill.id,
      minutes: blockMin,
      description: drill.description,
    });
    remaining -= blockMin;
  }

  const explanation = weakAreas && weakAreas.length > 0
    ? `Based on your recent data: ${weakAreas.map((a) => a.reason).join('. ')}. This plan targets those areas.`
    : 'Randomly selected drills to keep your practice varied and engaging.';

  return {
    title: 'Random Practice',
    explanation,
    blocks,
    totalMinutes: minutes,
    warmup: warmupMin > 0 ? {
      name: 'Warmup',
      minutes: warmupMin,
      description: 'Hit 5-10 easy swings to get loose. Start short and work up.',
    } : undefined,
  };
}
