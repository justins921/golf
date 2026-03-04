/**
 * Pre-Round Warmup Generator
 *
 * Generates a personalized warmup routine based on:
 * - Available time
 * - Practice location (range, putting green, etc.)
 * - SG weaknesses from recent rounds
 * - Wedge matrix distances
 * - Player's workout/mobility history
 */

import type { Round, RoundHole, WedgeMatrix } from './types';
import { GOLF_EXERCISES } from './types';
import { analyzeRound } from './strokesGained';
import { generatePracticeReport, sgToWeakAreas } from './practicePrioritizer';
import type { PracticePriorityReport, PracticeRecommendation } from './practicePrioritizer';

// ============================================================
// Types
// ============================================================

export interface WarmupRoutine {
  title: string;
  totalMinutes: number;
  phases: WarmupPhase[];
  personalizations: string[]; // Why this routine was chosen
}

export interface WarmupPhase {
  name: string;
  minutes: number;
  icon: string; // emoji-like identifier for UI
  activities: WarmupActivity[];
}

export interface WarmupActivity {
  name: string;
  description: string;
  duration: string; // "2 min", "5 balls", etc.
  focusArea?: string;
}

export type WarmupDuration = 15 | 30 | 45 | 60;
export type WarmupFacility = 'full' | 'range_only' | 'putting_only' | 'no_warmup';

// ============================================================
// Generator
// ============================================================

export function generateWarmup(options: {
  duration: WarmupDuration;
  facility: WarmupFacility;
  rounds: Round[];
  holes: RoundHole[]; // holes for most recent round
  wedgeMatrix: WedgeMatrix | null;
  recentReport: PracticePriorityReport | null;
}): WarmupRoutine {
  const { duration, facility, rounds, holes, wedgeMatrix, recentReport } = options;

  const personalizations: string[] = [];
  const phases: WarmupPhase[] = [];

  // Determine weak areas
  const weakAreas = recentReport
    ? recentReport.recommendations.slice(0, 3)
    : [];

  if (weakAreas.length > 0) {
    personalizations.push(`Targeting: ${weakAreas.map((w) => w.title).join(', ')}`);
  }

  // Time allocation based on duration and facility
  const timeAlloc = allocateTime(duration, facility, weakAreas);

  // 1. Body warmup (always included if time allows)
  if (timeAlloc.body > 0) {
    phases.push(buildBodyPhase(timeAlloc.body));
  }

  // 2. Putting warmup
  if (timeAlloc.putting > 0 && (facility === 'full' || facility === 'putting_only')) {
    phases.push(buildPuttingPhase(timeAlloc.putting, weakAreas));
  }

  // 3. Short game warmup
  if (timeAlloc.shortGame > 0 && facility === 'full') {
    phases.push(buildShortGamePhase(timeAlloc.shortGame, wedgeMatrix, weakAreas));
  }

  // 4. Full swing warmup
  if (timeAlloc.fullSwing > 0 && (facility === 'full' || facility === 'range_only')) {
    phases.push(buildFullSwingPhase(timeAlloc.fullSwing, wedgeMatrix, weakAreas));
    personalizations.push('Full swing progression: wedges to driver');
  }

  // 5. Mental / course strategy
  if (timeAlloc.mental > 0) {
    phases.push(buildMentalPhase(timeAlloc.mental, rounds));
  }

  // Add wedge matrix info if available
  if (wedgeMatrix && (facility === 'full' || facility === 'range_only')) {
    personalizations.push(`Using your ${wedgeMatrix.swing_system} wedge distances`);
  }

  return {
    title: getTitle(duration, facility),
    totalMinutes: duration,
    phases,
    personalizations,
  };
}

// ============================================================
// Time allocation
// ============================================================

interface TimeAllocation {
  body: number;
  putting: number;
  shortGame: number;
  fullSwing: number;
  mental: number;
}

function allocateTime(
  duration: WarmupDuration,
  facility: WarmupFacility,
  weakAreas: PracticeRecommendation[],
): TimeAllocation {
  // Base allocations by duration
  const base: Record<WarmupDuration, TimeAllocation> = {
    15: { body: 3, putting: 5, shortGame: 0, fullSwing: 7, mental: 0 },
    30: { body: 5, putting: 8, shortGame: 5, fullSwing: 10, mental: 2 },
    45: { body: 5, putting: 10, shortGame: 8, fullSwing: 18, mental: 4 },
    60: { body: 7, putting: 12, shortGame: 10, fullSwing: 25, mental: 6 },
  };

  const alloc = { ...base[duration] };

  // Adjust for facility
  if (facility === 'putting_only') {
    alloc.putting = duration - alloc.body - (alloc.mental > 0 ? 2 : 0);
    alloc.shortGame = 0;
    alloc.fullSwing = 0;
    alloc.mental = alloc.mental > 0 ? 2 : 0;
  } else if (facility === 'range_only') {
    alloc.fullSwing = duration - alloc.body - (alloc.mental > 0 ? 2 : 0);
    alloc.putting = 0;
    alloc.shortGame = 0;
    alloc.mental = alloc.mental > 0 ? 2 : 0;
  } else if (facility === 'no_warmup') {
    return { body: Math.min(5, duration), putting: 0, shortGame: 0, fullSwing: 0, mental: Math.max(0, duration - 5) };
  }

  // Boost weak areas slightly
  if (weakAreas.length > 0) {
    const weakCats = weakAreas.map((w) => w.category);
    if (weakCats.includes('putting') && alloc.putting > 0) alloc.putting += 2;
    if (weakCats.includes('short_game') && alloc.shortGame > 0) alloc.shortGame += 2;
    if ((weakCats.includes('approach') || weakCats.includes('off_the_tee')) && alloc.fullSwing > 0) alloc.fullSwing += 2;
    // Rebalance
    const total = alloc.body + alloc.putting + alloc.shortGame + alloc.fullSwing + alloc.mental;
    if (total > duration) {
      const excess = total - duration;
      // Trim from mental first, then body
      const mentalTrim = Math.min(alloc.mental, excess);
      alloc.mental -= mentalTrim;
      const bodyTrim = Math.min(alloc.body - 2, excess - mentalTrim);
      if (bodyTrim > 0) alloc.body -= bodyTrim;
    }
  }

  return alloc;
}

// ============================================================
// Phase builders
// ============================================================

function buildBodyPhase(minutes: number): WarmupPhase {
  const mobilityExercises = GOLF_EXERCISES['Mobility'];
  const warmupExercises = GOLF_EXERCISES['Warmup'];

  const activities: WarmupActivity[] = [];

  if (minutes >= 5) {
    // Longer body warmup
    activities.push(
      { name: 'Hip 90/90 Rotations', description: 'Sit on floor, rotate both legs side to side', duration: '30 sec each side', focusArea: 'Hip mobility' },
      { name: 'Thoracic Spine Rotations', description: 'Open books or thread the needle', duration: '30 sec each side', focusArea: 'Upper back rotation' },
      { name: 'Leg Swings', description: 'Front-to-back and side-to-side, 10 each', duration: '1 min', focusArea: 'Dynamic flexibility' },
      { name: 'Band Pull-Aparts', description: 'Light resistance, 15 reps', duration: '30 sec', focusArea: 'Shoulder activation' },
      { name: 'Torso Rotations w/ Club', description: 'Club across shoulders, rotate through full range', duration: '1 min', focusArea: 'Golf-specific rotation' },
    );
  } else {
    // Quick body warmup
    activities.push(
      { name: 'Arm Circles + Torso Rotations', description: '10 forward, 10 back, then club across shoulders', duration: '1 min', focusArea: 'Upper body activation' },
      { name: 'Leg Swings', description: 'Front-to-back 10 each leg', duration: '1 min', focusArea: 'Lower body activation' },
      { name: 'Deep Squat Hold', description: 'Hold deep squat, rotate torso side to side', duration: '30 sec', focusArea: 'Full body mobility' },
    );
  }

  return {
    name: 'Body Warmup',
    minutes,
    icon: 'body',
    activities,
  };
}

function buildPuttingPhase(minutes: number, weakAreas: PracticeRecommendation[]): WarmupPhase {
  const activities: WarmupActivity[] = [];
  const hasPuttingWeakness = weakAreas.some((w) => w.category === 'putting');

  // Always start with lag putts (speed calibration)
  activities.push({
    name: 'Lag Putts (Speed Calibration)',
    description: 'Putt to the fringe or a distant hole. Focus on speed feel, not make rate. Roll 5-6 balls from 30-40ft.',
    duration: `${Math.min(3, minutes)} min`,
    focusArea: 'Speed calibration',
  });

  if (minutes >= 5) {
    // Medium distance putts
    activities.push({
      name: 'Mid-Range (10-15ft)',
      description: 'Roll 5 putts from 10-15 feet. Read the break, commit to your line.',
      duration: '2 min',
      focusArea: 'Read & commitment',
    });
  }

  if (minutes >= 8) {
    // Short putts for confidence
    activities.push({
      name: 'Confidence Makers (3-5ft)',
      description: 'Make 5-10 straight putts from 3-5 feet. Build confidence before the round.',
      duration: '2 min',
      focusArea: 'Start line & confidence',
    });
  }

  if (minutes >= 10 && hasPuttingWeakness) {
    activities.push({
      name: 'Pressure Finish',
      description: 'Make 3 in a row from 4 feet. If you miss, restart. End on a make.',
      duration: '2 min',
      focusArea: 'Pressure putting',
    });
  }

  if (minutes >= 10) {
    activities.push({
      name: 'Speed Calibration Check',
      description: 'End with 3 lag putts from 25-30ft. Dial in your speed one final time.',
      duration: '2 min',
      focusArea: 'Final speed check',
    });
  }

  return {
    name: 'Putting Green',
    minutes,
    icon: 'putting',
    activities,
  };
}

function buildShortGamePhase(
  minutes: number,
  wedgeMatrix: WedgeMatrix | null,
  weakAreas: PracticeRecommendation[],
): WarmupPhase {
  const activities: WarmupActivity[] = [];
  const hasShortGameWeakness = weakAreas.some((w) => w.category === 'short_game');

  // Basic chip shots
  activities.push({
    name: 'Bump & Run Chips',
    description: 'Simple chips from the fringe, 10-15 yards. Focus on clean contact and landing spot.',
    duration: `${Math.min(3, minutes)} min`,
    focusArea: 'Contact quality',
  });

  if (minutes >= 5) {
    activities.push({
      name: 'Pitch Shots (20-40 yards)',
      description: 'Hit 5-8 pitch shots with your go-to wedge. Vary the distances slightly.',
      duration: '3 min',
      focusArea: 'Distance control',
    });
  }

  if (minutes >= 8 && hasShortGameWeakness) {
    const wedgeInfo = wedgeMatrix
      ? ` Use your ${wedgeMatrix.wedge_clubs[0] || 'SW'} at the shortest swing length.`
      : '';
    activities.push({
      name: 'Scoring Zone (40-60 yards)',
      description: `Half-swing wedges from 40-60 yards. This is where you save pars.${wedgeInfo}`,
      duration: '3 min',
      focusArea: 'Scoring zone',
    });
  }

  if (minutes >= 10) {
    activities.push({
      name: 'Bunker Shots',
      description: 'Hit 3-5 greenside bunker shots. Focus on getting out cleanly.',
      duration: '2 min',
      focusArea: 'Sand confidence',
    });
  }

  return {
    name: 'Short Game',
    minutes,
    icon: 'short_game',
    activities,
  };
}

function buildFullSwingPhase(
  minutes: number,
  wedgeMatrix: WedgeMatrix | null,
  weakAreas: PracticeRecommendation[],
): WarmupPhase {
  const activities: WarmupActivity[] = [];
  const hasApproachWeakness = weakAreas.some((w) => w.category === 'approach');
  const hasOTTWeakness = weakAreas.some((w) => w.category === 'off_the_tee');

  // Always start with short clubs
  const wedgeClub = wedgeMatrix?.wedge_clubs?.[0] || 'PW';
  activities.push({
    name: `Half Swings (${wedgeClub})`,
    description: 'Start with easy half swings. Focus on tempo and contact. 5-8 balls.',
    duration: `${Math.min(3, minutes)} min`,
    focusArea: 'Tempo calibration',
  });

  if (minutes >= 7) {
    activities.push({
      name: 'Short Irons (8i-9i)',
      description: 'Work up to full swings. Hit 5-6 shots at your stock yardage. Commit to your target.',
      duration: '3 min',
      focusArea: 'Stock yardage',
    });
  }

  if (minutes >= 10) {
    activities.push({
      name: 'Mid Irons (6i-7i)',
      description: 'Hit 4-5 shots. Focus on your stock ball flight shape.',
      duration: '3 min',
      focusArea: hasApproachWeakness ? 'GIR approach confidence' : 'Stock shot shape',
    });
  }

  if (minutes >= 15) {
    activities.push({
      name: 'Hybrids / Fairway Woods',
      description: 'Hit 3-5 shots with your longest non-driver club. Smooth tempo.',
      duration: '3 min',
      focusArea: 'Long club confidence',
    });
  }

  if (minutes >= 10) {
    activities.push({
      name: 'Driver',
      description: hasOTTWeakness
        ? 'Hit 5-8 drivers. Start at 80% effort and find your reliable shape. Pick a specific target for each.'
        : 'Hit 5-6 drivers at comfortable tempo. Pick a target and commit.',
      duration: `${Math.min(5, minutes - 7)} min`,
      focusArea: hasOTTWeakness ? 'Fairway finding' : 'Confidence tee shots',
    });
  }

  if (minutes >= 20) {
    // Simulation shots
    activities.push({
      name: 'First Hole Simulation',
      description: 'Visualize your first tee shot. Pick the exact club and target. Hit it with full commitment.',
      duration: '2 min',
      focusArea: 'First tee readiness',
    });
  }

  if (minutes >= 25 && wedgeMatrix) {
    // Extra wedge calibration
    const distances = Object.entries(wedgeMatrix.distances)
      .slice(0, 3)
      .map(([key, dist]) => `${key.split('|')[0]} → ${dist}yd`)
      .join(', ');
    activities.push({
      name: 'Wedge Distance Check',
      description: `Verify your key wedge numbers: ${distances || 'hit 3 wedge yardages'}`,
      duration: '3 min',
      focusArea: 'Distance calibration',
    });
  }

  return {
    name: 'Full Swing',
    minutes,
    icon: 'full_swing',
    activities,
  };
}

function buildMentalPhase(minutes: number, rounds: Round[]): WarmupPhase {
  const activities: WarmupActivity[] = [];

  activities.push({
    name: 'Course Strategy',
    description: 'Review the first 3 holes in your mind. Know your targets, layup distances, and bail-out areas.',
    duration: `${Math.min(2, minutes)} min`,
    focusArea: 'Course management',
  });

  if (minutes >= 3) {
    activities.push({
      name: 'Tempo Thought',
      description: 'Pick one swing thought for the day. Keep it simple: tempo, target, or trust.',
      duration: '1 min',
      focusArea: 'Mental focus',
    });
  }

  if (minutes >= 5) {
    const lastRound = rounds.find((r) => r.total_score != null);
    const goalNote = lastRound
      ? `Last round: ${lastRound.total_score}. What\'s one thing you can do better today?`
      : 'Set a process goal: fairways hit, up & down attempts, or no three-putts.';
    activities.push({
      name: 'Set Your Goal',
      description: goalNote,
      duration: '1 min',
      focusArea: 'Intention setting',
    });
  }

  return {
    name: 'Mental Prep',
    minutes,
    icon: 'mental',
    activities,
  };
}

// ============================================================
// Helpers
// ============================================================

function getTitle(duration: WarmupDuration, facility: WarmupFacility): string {
  const facilityLabel: Record<WarmupFacility, string> = {
    full: 'Full Facility',
    range_only: 'Range Only',
    putting_only: 'Putting Green',
    no_warmup: 'Mental Prep',
  };
  return `${duration}-Minute ${facilityLabel[facility]} Warmup`;
}
