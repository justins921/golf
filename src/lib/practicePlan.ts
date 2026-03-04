import type { DrillCategory } from './practice/types';

// ── Types ───────────────────────────────────────────────────

export type WeeklyHours = 2 | 3 | 5 | 7 | 10;
export type PlanLength = 1 | 2 | 4; // weeks
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export interface SGWeakness {
  category: 'putting' | 'short_game' | 'approach' | 'off_the_tee';
  sgPerRound: number; // negative = losing strokes
}

export interface PracticePlanConfig {
  weeklyHours: WeeklyHours;
  planLength: PlanLength;
  level: SkillLevel;
  weaknesses: SGWeakness[]; // sorted worst first
  availableFacilities: ('range' | 'putting_green' | 'short_game_area' | 'course')[];
  goals: string[]; // user's season goal titles for context
}

export interface PracticePlanDay {
  day: string; // "Monday", "Tuesday", etc.
  focus: string; // e.g., "Short Game + Putting"
  totalMinutes: number;
  blocks: PracticePlanBlock[];
}

export interface PracticePlanBlock {
  name: string;
  category: DrillCategory | 'warmup' | 'cooldown';
  minutes: number;
  description: string;
  drillSuggestion?: string; // reference to existing drill ID
  intensity: 'low' | 'medium' | 'high';
  reps?: string; // e.g., "30 balls", "10 putts each"
}

export interface WeeklyPlan {
  weekNumber: number;
  theme: string;
  days: PracticePlanDay[];
  weeklyMinutes: number;
  focusBreakdown: Record<string, number>; // category -> minutes
}

export interface PracticePlan {
  title: string;
  config: PracticePlanConfig;
  weeks: WeeklyPlan[];
  totalMinutes: number;
  insights: string[];
}

// ── Constants ───────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  putting: 'Putting',
  short_game: 'Short Game',
  full_swing: 'Full Swing',
  wedges: 'Wedges',
  approach: 'Approach',
  off_the_tee: 'Off the Tee',
  warmup: 'Warmup',
  cooldown: 'Cooldown',
};

// Map SG categories to practice categories
const SG_TO_PRACTICE: Record<string, DrillCategory> = {
  putting: 'putting',
  short_game: 'short_game',
  approach: 'wedges',
  off_the_tee: 'full_swing',
};

// Base time allocation % by category (before SG adjustments)
const BASE_ALLOCATION: Record<SkillLevel, Record<string, number>> = {
  beginner: { putting: 0.30, short_game: 0.25, wedges: 0.25, full_swing: 0.20 },
  intermediate: { putting: 0.25, short_game: 0.25, wedges: 0.25, full_swing: 0.25 },
  advanced: { putting: 0.20, short_game: 0.20, wedges: 0.30, full_swing: 0.30 },
};

// Sessions per week by hours available
const SESSIONS_PER_WEEK: Record<WeeklyHours, number> = {
  2: 2, 3: 3, 5: 4, 7: 5, 10: 6,
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ── Drill Library ───────────────────────────────────────────

interface DrillTemplate {
  name: string;
  category: DrillCategory;
  description: string;
  drillId?: string;
  intensity: 'low' | 'medium' | 'high';
  minMinutes: number;
  maxMinutes: number;
  reps?: string;
  level: SkillLevel[];
}

const DRILL_LIBRARY: DrillTemplate[] = [
  // Putting
  { name: 'Gate Drill (3ft)', category: 'putting', description: 'Two-tee gate, focus on start line. Make 10 in a row.', drillId: 'drill-start-line-gate', intensity: 'medium', minMinutes: 5, maxMinutes: 15, reps: '10+ putts', level: ['beginner', 'intermediate', 'advanced'] },
  { name: 'Lag Putting (20-40ft)', category: 'putting', description: 'Roll putts to leave distance markers. Goal: all within 3ft.', drillId: 'drill-lag-putting', intensity: 'low', minMinutes: 10, maxMinutes: 20, reps: '15 putts', level: ['beginner', 'intermediate', 'advanced'] },
  { name: 'Pressure Putting', category: 'putting', description: 'Make 3 in a row from 4ft or restart. Build clutch confidence.', drillId: 'drill-pressure-putting', intensity: 'high', minMinutes: 5, maxMinutes: 15, reps: '3 in a row', level: ['intermediate', 'advanced'] },
  { name: 'Speed Ladder', category: 'putting', description: 'Putt to 10, 20, 30, 40ft. Each must go past the last.', intensity: 'medium', minMinutes: 10, maxMinutes: 15, reps: '3 rounds', level: ['beginner', 'intermediate', 'advanced'] },
  { name: 'Clock Drill', category: 'putting', description: '4 balls around hole at 3ft, 6ft, 9ft circles. Make all to advance.', intensity: 'high', minMinutes: 10, maxMinutes: 20, reps: '4 balls × 3 distances', level: ['intermediate', 'advanced'] },

  // Short game
  { name: 'Bump & Run Chips', category: 'short_game', description: 'Low running chips from 10-20yd. Land spot focus.', drillId: 'drill-pitch-chip', intensity: 'low', minMinutes: 10, maxMinutes: 20, reps: '20 chips', level: ['beginner', 'intermediate', 'advanced'] },
  { name: 'Pitch Shots (20-40yd)', category: 'short_game', description: 'Pitch to specific targets. Score by proximity to pin.', intensity: 'medium', minMinutes: 10, maxMinutes: 20, reps: '15 pitches', level: ['beginner', 'intermediate', 'advanced'] },
  { name: 'Bunker Escape', category: 'short_game', description: 'Get out of bunker and on green. Track escape rate.', drillId: 'drill-bunker-escape', intensity: 'medium', minMinutes: 10, maxMinutes: 15, reps: '15 shots', level: ['intermediate', 'advanced'] },
  { name: 'Up & Down Challenge', category: 'short_game', description: '9 different lies around green. Score as par 2s. Beat your record.', intensity: 'high', minMinutes: 15, maxMinutes: 25, reps: '9 holes', level: ['intermediate', 'advanced'] },
  { name: 'Flop Shot Practice', category: 'short_game', description: 'High soft shots over obstacles. Open face, full swing.', intensity: 'high', minMinutes: 10, maxMinutes: 15, reps: '10 shots', level: ['advanced'] },

  // Wedges
  { name: 'Wedge Ladder', category: 'wedges', description: 'Hit ascending targets: 40, 60, 80, 100yd. Build distance control.', drillId: 'drill-wedge-ladder', intensity: 'medium', minMinutes: 15, maxMinutes: 25, reps: '5 balls per distance', level: ['beginner', 'intermediate', 'advanced'] },
  { name: 'Random Wedge Targets', category: 'wedges', description: 'Random distances 40-120yd. Simulate on-course variety.', drillId: 'drill-random-wedge', intensity: 'high', minMinutes: 10, maxMinutes: 20, reps: '20 shots', level: ['intermediate', 'advanced'] },
  { name: 'Scoring Zone (50-100yd)', category: 'wedges', description: 'Focus on the scoring zone. Track proximity to pin.', drillId: 'drill-scoring-zone', intensity: 'medium', minMinutes: 15, maxMinutes: 25, reps: '20 shots', level: ['beginner', 'intermediate', 'advanced'] },
  { name: '3/4 Swing Control', category: 'wedges', description: 'Hit 3/4 swings with each wedge. Build partial shot repertoire.', intensity: 'medium', minMinutes: 10, maxMinutes: 20, reps: '5 per wedge', level: ['intermediate', 'advanced'] },

  // Full swing
  { name: 'Stock Shot Repetition', category: 'full_swing', description: 'Single club, same target. Build consistency and confidence.', drillId: 'drill-stock-shot', intensity: 'low', minMinutes: 10, maxMinutes: 20, reps: '20 balls', level: ['beginner', 'intermediate', 'advanced'] },
  { name: 'Tempo Ladder', category: 'full_swing', description: '75% → 85% → 100% effort. Feel the speed difference.', drillId: 'drill-tempo-ladder', intensity: 'medium', minMinutes: 10, maxMinutes: 15, reps: '5 per effort level', level: ['beginner', 'intermediate', 'advanced'] },
  { name: '9-Shot Grid', category: 'full_swing', description: 'High/Mid/Low × Draw/Straight/Fade. Full shot shape control.', drillId: 'drill-9shot', intensity: 'high', minMinutes: 15, maxMinutes: 30, reps: '9 combos × 2', level: ['advanced'] },
  { name: 'Low Point Drill', category: 'full_swing', description: 'Towel behind ball. Strike ball-first contact.', drillId: 'drill-lowpoint', intensity: 'medium', minMinutes: 10, maxMinutes: 15, reps: '15 balls', level: ['beginner', 'intermediate'] },
  { name: 'Driver Accuracy', category: 'full_swing', description: 'Pick a fairway-width target. Track hit rate out of 10.', intensity: 'medium', minMinutes: 10, maxMinutes: 20, reps: '10 drives', level: ['beginner', 'intermediate', 'advanced'] },
  { name: 'On-Course Simulation', category: 'full_swing', description: 'Play first 3 holes mentally. Change club each shot.', intensity: 'high', minMinutes: 15, maxMinutes: 25, reps: 'Full simulation', level: ['intermediate', 'advanced'] },
];

// ── Generator ───────────────────────────────────────────────

function adjustAllocation(
  base: Record<string, number>,
  weaknesses: SGWeakness[],
): Record<string, number> {
  const alloc = { ...base };

  // Boost weak areas, reduce strong areas
  for (const w of weaknesses) {
    const practiceCategory = SG_TO_PRACTICE[w.category];
    if (!practiceCategory) continue;

    // More negative SG = bigger boost (up to +15% allocation)
    const boost = Math.min(0.15, Math.abs(w.sgPerRound) * 0.05);
    alloc[practiceCategory] = (alloc[practiceCategory] ?? 0.25) + boost;
  }

  // Normalize to 100%
  const total = Object.values(alloc).reduce((a, b) => a + b, 0);
  for (const key of Object.keys(alloc)) {
    alloc[key] = alloc[key] / total;
  }

  return alloc;
}

function selectDrills(
  category: DrillCategory,
  minutes: number,
  level: SkillLevel,
  usedDrills: Set<string>,
): PracticePlanBlock[] {
  const available = DRILL_LIBRARY.filter(
    d => d.category === category && d.level.includes(level) && !usedDrills.has(d.name)
  );
  if (available.length === 0) return [];

  const blocks: PracticePlanBlock[] = [];
  let remaining = minutes;

  // Pick drills to fill the time
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  for (const drill of shuffled) {
    if (remaining < drill.minMinutes) continue;
    const drillTime = Math.min(drill.maxMinutes, remaining);
    blocks.push({
      name: drill.name,
      category: drill.category,
      minutes: drillTime,
      description: drill.description,
      drillSuggestion: drill.drillId,
      intensity: drill.intensity,
      reps: drill.reps,
    });
    usedDrills.add(drill.name);
    remaining -= drillTime;
    if (remaining < 5) break;
  }

  return blocks;
}

function generateDay(
  dayName: string,
  focus: string,
  totalMinutes: number,
  categories: { category: DrillCategory; minutes: number }[],
  level: SkillLevel,
  usedDrills: Set<string>,
): PracticePlanDay {
  const blocks: PracticePlanBlock[] = [];

  // Warmup (5 min for sessions 30min+, 3 min otherwise)
  const warmupMin = totalMinutes >= 30 ? 5 : 3;
  blocks.push({
    name: 'Dynamic Warmup',
    category: 'warmup',
    minutes: warmupMin,
    description: 'Hip rotations, torso twists, arm circles, half-speed practice swings.',
    intensity: 'low',
  });

  let remaining = totalMinutes - warmupMin;

  for (const { category, minutes } of categories) {
    const catMinutes = Math.min(minutes, remaining);
    if (catMinutes < 5) continue;
    const drills = selectDrills(category, catMinutes, level, usedDrills);
    blocks.push(...drills);
    remaining -= drills.reduce((s, b) => s + b.minutes, 0);
  }

  // Cooldown for longer sessions
  if (totalMinutes >= 45 && remaining >= 3) {
    blocks.push({
      name: 'Cooldown & Reflection',
      category: 'cooldown',
      minutes: 3,
      description: 'Light stretching. Note what felt good and what to work on next.',
      intensity: 'low',
    });
  }

  return { day: dayName, focus, totalMinutes, blocks };
}

function buildWeekTheme(weekNum: number, planLength: PlanLength, weaknesses: SGWeakness[]): string {
  if (planLength === 1) return 'Balanced Focus';
  if (planLength === 2) {
    return weekNum === 1 ? 'Foundation & Fundamentals' : 'Pressure & Performance';
  }
  // 4-week plan
  const themes = [
    'Foundation & Fundamentals',
    'Weak Area Deep Dive',
    'Scoring & Pressure',
    'On-Course Simulation',
  ];
  return themes[weekNum - 1] ?? 'Balanced Focus';
}

export function generatePracticePlan(config: PracticePlanConfig): PracticePlan {
  const {
    weeklyHours, planLength, level, weaknesses,
  } = config;

  const sessionsPerWeek = SESSIONS_PER_WEEK[weeklyHours];
  const totalWeeklyMinutes = weeklyHours * 60;
  const minutesPerSession = Math.round(totalWeeklyMinutes / sessionsPerWeek);

  // Compute allocation with SG adjustments
  const allocation = adjustAllocation(BASE_ALLOCATION[level], weaknesses);

  // Generate insights
  const insights: string[] = [];
  if (weaknesses.length > 0) {
    const worst = weaknesses[0];
    insights.push(`Your biggest opportunity is ${CATEGORY_LABELS[worst.category] ?? worst.category} (${worst.sgPerRound.toFixed(1)} SG/round). We've allocated extra time here.`);
  }
  insights.push(`${sessionsPerWeek} sessions/week × ${minutesPerSession} min = ${totalWeeklyMinutes} min weekly`);
  const topAlloc = Object.entries(allocation).sort((a, b) => b[1] - a[1]);
  insights.push(`Time split: ${topAlloc.map(([k, v]) => `${CATEGORY_LABELS[k] ?? k} ${Math.round(v * 100)}%`).join(', ')}`);

  // Build day focus rotation
  const focusRotation = buildFocusRotation(allocation, sessionsPerWeek);

  // Space sessions across the week
  const daySpacing = Math.floor(7 / sessionsPerWeek);
  const sessionDays: string[] = [];
  for (let i = 0; i < sessionsPerWeek; i++) {
    const dayIndex = Math.min((i * daySpacing + (i > 0 ? 1 : 0)) % 7, 6);
    sessionDays.push(DAYS[dayIndex]);
  }

  const weeks: WeeklyPlan[] = [];

  for (let w = 1; w <= planLength; w++) {
    const usedDrills = new Set<string>();
    const days: PracticePlanDay[] = [];
    const focusBreakdown: Record<string, number> = {};

    // Adjust intensity for progression across weeks
    const weekLevel = w <= planLength / 2 ? level : level;

    for (let d = 0; d < sessionsPerWeek; d++) {
      const rotation = focusRotation[d % focusRotation.length];
      const categories = rotation.categories.map(c => ({
        category: c.category,
        minutes: Math.round(minutesPerSession * c.pct),
      }));

      const day = generateDay(
        sessionDays[d],
        rotation.focus,
        minutesPerSession,
        categories,
        weekLevel,
        usedDrills,
      );
      days.push(day);

      // Track breakdown
      for (const block of day.blocks) {
        const cat = block.category === 'warmup' || block.category === 'cooldown' ? block.category : block.category;
        focusBreakdown[cat] = (focusBreakdown[cat] ?? 0) + block.minutes;
      }
    }

    weeks.push({
      weekNumber: w,
      theme: buildWeekTheme(w, planLength, weaknesses),
      days,
      weeklyMinutes: days.reduce((s, d) => s + d.totalMinutes, 0),
      focusBreakdown,
    });
  }

  return {
    title: `${planLength}-Week Practice Plan`,
    config,
    weeks,
    totalMinutes: weeks.reduce((s, w) => s + w.weeklyMinutes, 0),
    insights,
  };
}

// ── Focus rotation builder ──────────────────────────────────

interface FocusDay {
  focus: string;
  categories: { category: DrillCategory; pct: number }[];
}

function buildFocusRotation(
  allocation: Record<string, number>,
  sessionsPerWeek: number,
): FocusDay[] {
  const sorted = Object.entries(allocation)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, pct]) => ({ category: cat as DrillCategory, pct }));

  if (sessionsPerWeek <= 2) {
    // Full mix each day
    return [{ focus: 'Full Practice', categories: sorted }];
  }

  if (sessionsPerWeek <= 3) {
    // 2-category focus days
    return [
      { focus: `${CATEGORY_LABELS[sorted[0].category]} + ${CATEGORY_LABELS[sorted[1].category]}`,
        categories: [{ category: sorted[0].category, pct: 0.5 }, { category: sorted[1].category, pct: 0.5 }] },
      { focus: `${CATEGORY_LABELS[sorted[2]?.category ?? sorted[0].category]} + ${CATEGORY_LABELS[sorted[3]?.category ?? sorted[1].category]}`,
        categories: [{ category: sorted[2]?.category ?? sorted[0].category, pct: 0.5 }, { category: sorted[3]?.category ?? sorted[1].category, pct: 0.5 }] },
      { focus: 'Weak Area Focus',
        categories: [{ category: sorted[0].category, pct: 0.6 }, { category: sorted[1].category, pct: 0.4 }] },
    ];
  }

  // 4+ sessions: dedicated focus days + mixed
  const rotation: FocusDay[] = [];
  for (const entry of sorted) {
    rotation.push({
      focus: `${CATEGORY_LABELS[entry.category]} Focus`,
      categories: [
        { category: entry.category, pct: 0.65 },
        { category: sorted.find(s => s.category !== entry.category)?.category ?? sorted[0].category, pct: 0.35 },
      ],
    });
  }
  // Add a mixed day
  rotation.push({ focus: 'Full Practice', categories: sorted });
  return rotation;
}
