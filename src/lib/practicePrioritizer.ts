/**
 * Practice Prioritizer — analyzes Strokes Gained data to generate
 * targeted practice recommendations ranked by improvement potential.
 *
 * Links SG analysis to the existing drill/practice system.
 */

import type { RoundSGAnalysis } from './strokesGained';
import type { DrillCategory } from './practice/types';

// ============================================================
// Priority recommendation types
// ============================================================

export interface PracticeRecommendation {
  priority: number; // 1 = highest priority
  category: 'putting' | 'short_game' | 'approach' | 'off_the_tee';
  drillCategory: DrillCategory; // Maps to practice drill system
  title: string;
  reason: string;
  sgImpact: number; // How many strokes this is costing (negative = losing)
  benchmarkComparison: string;
  drillSuggestions: string[];
  tip: string;
}

export interface PracticePriorityReport {
  handicap: number;
  roundDate: string;
  courseName: string;
  score: number;
  recommendations: PracticeRecommendation[];
  summary: string;
  biggestOpportunity: string;
}

// ============================================================
// Analyze and prioritize
// ============================================================

export function generatePracticeReport(
  analysis: RoundSGAnalysis,
  roundDate: string,
  courseName: string,
  score: number,
): PracticePriorityReport {
  const recs: PracticeRecommendation[] = [];
  const b = analysis.benchmark;

  // --- Putting analysis ---
  const puttingRecs = analyzePutting(analysis, b);
  recs.push(...puttingRecs);

  // --- Short game analysis ---
  const shortGameRecs = analyzeShortGame(analysis, b);
  recs.push(...shortGameRecs);

  // --- Approach analysis ---
  const approachRecs = analyzeApproach(analysis, b);
  recs.push(...approachRecs);

  // --- Off the tee analysis ---
  const ottRecs = analyzeOffTheTee(analysis, b);
  recs.push(...ottRecs);

  // Sort by absolute SG impact (biggest loss first)
  recs.sort((a, b) => a.sgImpact - b.sgImpact);

  // Assign priorities
  recs.forEach((r, i) => { r.priority = i + 1; });

  // Summary
  const categories = [
    { name: 'Putting', sg: analysis.sgPutting },
    { name: 'Short Game', sg: analysis.sgShortGame },
    { name: 'Approach', sg: analysis.sgApproach },
    { name: 'Off the Tee', sg: analysis.sgOtt },
  ].sort((a, b) => a.sg - b.sg);

  const worst = categories[0];
  const biggestOpportunity = `${worst.name} (${formatSG(worst.sg)} SG)`;

  const summary = categories
    .map((c) => `${c.name}: ${formatSG(c.sg)}`)
    .join(' | ');

  return {
    handicap: analysis.handicap,
    roundDate,
    courseName,
    score,
    recommendations: recs,
    summary,
    biggestOpportunity,
  };
}

// ============================================================
// Category analyzers
// ============================================================

function analyzePutting(
  analysis: RoundSGAnalysis,
  b: typeof analysis.benchmark,
): PracticeRecommendation[] {
  const recs: PracticeRecommendation[] = [];
  const sg = analysis.sgPutting;

  // Three-putt problem
  if (analysis.threePuttCount > 2) {
    recs.push({
      priority: 0,
      category: 'putting',
      drillCategory: 'putting',
      title: 'Eliminate Three-Putts',
      reason: `${analysis.threePuttCount} three-putts this round (benchmark: ~${Math.round(18 * b.threePuttPctGir / 100)} for a ${b.label} golfer).`,
      sgImpact: -(analysis.threePuttCount - Math.round(18 * b.threePuttPctGir / 100)) * 0.7,
      benchmarkComparison: `${analysis.threePuttCount} three-putts vs ~${Math.round(18 * b.threePuttPctGir / 100)} expected`,
      drillSuggestions: [
        'Lag Putting Distance Control — focus on leaving everything within 3ft',
        'Speed Control drill — putt to a line, not a hole',
        '20ft and 30ft Lag drills',
      ],
      tip: 'Three-putts are almost always speed problems, not line problems. Practice lag putting to eliminate the long second putt.',
    });
  }

  // Overall putting SG
  if (sg < -1.0) {
    const puttDiff = analysis.totalPutts - b.puttsPerRound;
    recs.push({
      priority: 0,
      category: 'putting',
      drillCategory: 'putting',
      title: 'Putting Needs Work',
      reason: `${analysis.totalPutts} putts this round vs ${b.puttsPerRound} benchmark. Costing ${formatSG(sg)} strokes.`,
      sgImpact: sg,
      benchmarkComparison: `${analysis.totalPutts} putts vs ${b.puttsPerRound} benchmark (${puttDiff > 0 ? '+' : ''}${puttDiff.toFixed(0)} extra)`,
      drillSuggestions: [
        'Start Line Gate drill — groove your start line',
        'Pressure Putting (Devil Ball) — build clutch performance',
        '6ft Straight and 8ft Straight — the scoring range',
      ],
      tip: 'Focus on mid-range putts (6-10ft) first — this is where most strokes are gained or lost on the greens.',
    });
  }

  // GIR putting (making birdie putts)
  if (analysis.girCount > 0 && analysis.puttsPerGir > b.puttsPerGir + 0.2) {
    recs.push({
      priority: 0,
      category: 'putting',
      drillCategory: 'putting',
      title: 'Putting on Greens Hit in Regulation',
      reason: `Averaging ${analysis.puttsPerGir} putts on GIR holes vs ${b.puttsPerGir} benchmark.`,
      sgImpact: -(analysis.puttsPerGir - b.puttsPerGir) * analysis.girCount / 18 * 18,
      benchmarkComparison: `${analysis.puttsPerGir} putts/GIR vs ${b.puttsPerGir} benchmark`,
      drillSuggestions: [
        '15ft and 20ft Lag drills — typical GIR first putt distances',
        'Speed Control drill from 20-40ft',
      ],
      tip: 'GIR putts are typically 20-35ft. Focus on two-putting from this range before worrying about make rate.',
    });
  }

  return recs;
}

function analyzeShortGame(
  analysis: RoundSGAnalysis,
  b: typeof analysis.benchmark,
): PracticeRecommendation[] {
  const recs: PracticeRecommendation[] = [];
  const sg = analysis.sgShortGame;

  if (sg < -0.5) {
    recs.push({
      priority: 0,
      category: 'short_game',
      drillCategory: 'short_game',
      title: 'Short Game Costing Strokes',
      reason: `Short game SG: ${formatSG(sg)}. ${analysis.upAndDownPct.toFixed(0)}% up & down rate vs ${b.upAndDownPct}% benchmark.`,
      sgImpact: sg,
      benchmarkComparison: `${analysis.upAndDownPct.toFixed(0)}% up & down vs ${b.upAndDownPct}% benchmark`,
      drillSuggestions: [
        'Pitch & Chip Proximity drill — get the ball closer to the hole',
        'Scoring Zone Challenge — 50-100 yard shots',
        'Random Wedge Targets — build adaptability',
      ],
      tip: 'Most short game strokes are lost by leaving chips/pitches too far from the hole, not by missing greens entirely. Focus on proximity.',
    });
  }

  // Up & down rate
  if (analysis.upAndDownAttempts >= 3 && analysis.upAndDownPct < b.upAndDownPct - 10) {
    recs.push({
      priority: 0,
      category: 'short_game',
      drillCategory: 'short_game',
      title: 'Improve Up & Down Conversions',
      reason: `Converting ${analysis.upAndDownPct.toFixed(0)}% of up & down attempts vs ${b.upAndDownPct}% expected.`,
      sgImpact: -(b.upAndDownPct - analysis.upAndDownPct) / 100 * analysis.upAndDownAttempts * 0.5,
      benchmarkComparison: `${analysis.upAndDownMade}/${analysis.upAndDownAttempts} conversions (${analysis.upAndDownPct.toFixed(0)}%) vs ${b.upAndDownPct}%`,
      drillSuggestions: [
        'Pitch & Chip Proximity — simulate on-course distances',
        'Bunker Escape Rate — if sand is a factor',
      ],
      tip: 'Chip with one club you trust before diversifying. Consistency beats creativity around the greens.',
    });
  }

  return recs;
}

function analyzeApproach(
  analysis: RoundSGAnalysis,
  b: typeof analysis.benchmark,
): PracticeRecommendation[] {
  const recs: PracticeRecommendation[] = [];
  const sg = analysis.sgApproach;

  if (analysis.girPct < b.girPct - 5) {
    recs.push({
      priority: 0,
      category: 'approach',
      drillCategory: 'full_swing',
      title: 'Improve Greens in Regulation',
      reason: `Hitting ${analysis.girPct.toFixed(0)}% GIR vs ${b.girPct}% benchmark for a ${b.label} golfer.`,
      sgImpact: sg < 0 ? sg : -(b.girPct - analysis.girPct) / 100 * 18 * 0.3,
      benchmarkComparison: `${analysis.girCount}/${analysis.holes.length} GIR (${analysis.girPct.toFixed(0)}%) vs ${b.girPct}%`,
      drillSuggestions: [
        'Stock Shot Repetition — groove your most-used approach club',
        'Wedge Distance Ladder — calibrate your scoring clubs',
        'Tempo Ladder — find your optimal swing speed',
      ],
      tip: 'GIR is the strongest predictor of scoring. Even hitting the edge of the green counts — aim for the fat part.',
    });
  }

  return recs;
}

function analyzeOffTheTee(
  analysis: RoundSGAnalysis,
  b: typeof analysis.benchmark,
): PracticeRecommendation[] {
  const recs: PracticeRecommendation[] = [];
  const sg = analysis.sgOtt;

  if (analysis.firHoles > 0 && analysis.firPct < b.firPct - 10) {
    recs.push({
      priority: 0,
      category: 'off_the_tee',
      drillCategory: 'full_swing',
      title: 'Tee Shot Accuracy',
      reason: `Hitting ${analysis.firPct.toFixed(0)}% fairways vs ${b.firPct}% benchmark.`,
      sgImpact: sg < 0 ? sg : -(b.firPct - analysis.firPct) / 100 * analysis.firHoles * 0.2,
      benchmarkComparison: `${analysis.firCount}/${analysis.firHoles} fairways (${analysis.firPct.toFixed(0)}%) vs ${b.firPct}%`,
      drillSuggestions: [
        'Stock Shot Repetition with driver — find your reliable shape',
        '9-Shot Flight Drill — understand your tendencies',
        'Tempo Ladder — 85% effort often produces better results',
      ],
      tip: 'Missing fairways in the same direction? That\'s a fixable pattern. Random misses both ways suggest a tempo or alignment issue.',
    });
  }

  if (analysis.totalPenalties >= 2) {
    recs.push({
      priority: 0,
      category: 'off_the_tee',
      drillCategory: 'full_swing',
      title: 'Reduce Penalty Strokes',
      reason: `${analysis.totalPenalties} penalty strokes this round. Each costs ~1 full stroke.`,
      sgImpact: -analysis.totalPenalties * 0.8,
      benchmarkComparison: `${analysis.totalPenalties} penalties (most ${b.label} golfers average ~1 per round)`,
      drillSuggestions: [
        'Course management — identify the safe play on trouble holes',
        'Stock Shot Repetition — build a reliable tee shot you trust',
      ],
      tip: 'Penalties are the easiest strokes to eliminate. When in doubt, choose the club and target that eliminates one side of the hole.',
    });
  }

  return recs;
}

// ============================================================
// Helpers
// ============================================================

function formatSG(sg: number): string {
  if (sg >= 0) return `+${sg.toFixed(1)}`;
  return sg.toFixed(1);
}

/**
 * Map SG categories to weak areas for the existing buildRandomPlan function.
 */
export function sgToWeakAreas(
  report: PracticePriorityReport,
  maxAreas: number = 3,
): { category: DrillCategory; reason: string }[] {
  return report.recommendations
    .slice(0, maxAreas)
    .map((r) => ({
      category: r.drillCategory,
      reason: r.title,
    }));
}
