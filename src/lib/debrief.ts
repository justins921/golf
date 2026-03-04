import type { Round, RoundHole } from './types';
import { analyzeRound, type RoundSGAnalysis } from './strokesGained';

// ── Types ───────────────────────────────────────────────────

export interface DebriefInsight {
  category: 'positive' | 'negative' | 'neutral';
  area: string;
  title: string;
  detail: string;
  /** Plain-English version for casual golfers */
  casualDetail: string;
  impact: 'high' | 'medium' | 'low';
}

export interface DebriefActionItem {
  priority: number;
  area: string;
  action: string;
  /** Route to practice feature, if applicable */
  practiceLink?: string;
  practiceLinkLabel?: string;
  drillSuggestion?: string;
}

export interface HoleHighlight {
  holeNumber: number;
  par: number;
  score: number;
  type: 'best' | 'worst' | 'birdie' | 'double_plus' | 'three_putt' | 'one_putt';
  detail: string;
}

export interface ScoringPattern {
  label: string;
  value: string;
  context: string;
  trend: 'good' | 'bad' | 'neutral';
}

export interface WhatIf {
  label: string;
  savedStrokes: number;
  hypotheticalScore: number;
}

export interface CourseHistory {
  courseName: string;
  roundCount: number;
  avgScore: number;
  bestScore: number;
  thisScore: number;
  vsAvg: number; // negative = better than average
}

export interface RoundDebrief {
  round: Round;
  analysis: RoundSGAnalysis;
  overallVerdict: string;
  overallEmoji: string;
  insights: DebriefInsight[];
  actionItems: DebriefActionItem[];
  holeHighlights: HoleHighlight[];
  scoringPatterns: ScoringPattern[];
  strengths: string[];
  improvementAreas: string[];
  whatIfs: WhatIf[];
  courseHistory: CourseHistory | null;
}

// ── Reflection persistence (localStorage) ───────────────────

const REFLECTION_KEY_PREFIX = 'debrief_reflection_';
const NOTES_KEY_PREFIX = 'debrief_notes_';
const TAG_KEY_PREFIX = 'debrief_tags_';

export function getReflection(roundId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(REFLECTION_KEY_PREFIX + roundId);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveReflection(roundId: string, answers: Record<string, string>) {
  try {
    localStorage.setItem(REFLECTION_KEY_PREFIX + roundId, JSON.stringify(answers));
  } catch { /* quota exceeded */ }
}

export function getCoachNotes(roundId: string): string {
  try {
    return localStorage.getItem(NOTES_KEY_PREFIX + roundId) ?? '';
  } catch { return ''; }
}

export function saveCoachNotes(roundId: string, notes: string) {
  try {
    localStorage.setItem(NOTES_KEY_PREFIX + roundId, notes);
  } catch { /* quota exceeded */ }
}

export function getRoundTags(roundId: string): string[] {
  try {
    const raw = localStorage.getItem(TAG_KEY_PREFIX + roundId);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveRoundTags(roundId: string, tags: string[]) {
  try {
    localStorage.setItem(TAG_KEY_PREFIX + roundId, JSON.stringify(tags));
  } catch { /* quota exceeded */ }
}

export const AVAILABLE_TAGS = [
  'Tournament', 'Casual', 'Practice Round', 'Lesson', 'Playing Lesson',
  'Best Ball', 'Match Play', 'Scramble', 'Windy', 'Rain', 'Walking', 'Riding',
] as const;

// ── Generator ───────────────────────────────────────────────

export function generateDebrief(
  round: Round,
  holes: RoundHole[],
  recentRounds: Round[],
  handicap: number | null,
): RoundDebrief {
  const hcap = handicap ?? 15;
  const analysis = analyzeRound(round, holes, hcap);
  const insights: DebriefInsight[] = [];
  const actionItems: DebriefActionItem[] = [];
  const strengths: string[] = [];
  const improvementAreas: string[] = [];

  const score = round.total_score ?? 0;
  const par = holes.reduce((s, h) => s + h.par, 0) || 72;
  const toPar = score - par;

  // ── Overall Verdict ─────────────────────────────────────
  let overallVerdict: string;
  let overallEmoji: string;

  if (toPar <= -2) { overallVerdict = 'Outstanding round! Well under par.'; overallEmoji = 'fire'; }
  else if (toPar <= 0) { overallVerdict = 'Great round at or under par.'; overallEmoji = 'star'; }
  else if (toPar <= 5) { overallVerdict = 'Solid round with room to improve.'; overallEmoji = 'thumbsup'; }
  else if (toPar <= 10) { overallVerdict = 'Some good moments, but consistency needed.'; overallEmoji = 'muscle'; }
  else if (toPar <= 18) { overallVerdict = 'Tough round — focus on the positives.'; overallEmoji = 'chart'; }
  else { overallVerdict = 'Learning round. Every round teaches something.'; overallEmoji = 'book'; }

  // ── Course History ──────────────────────────────────────
  let courseHistory: CourseHistory | null = null;
  const courseRounds = recentRounds.filter(
    r => r.course_name === round.course_name && r.total_score != null && r.id !== round.id,
  );
  if (courseRounds.length >= 1) {
    const scores = courseRounds.map(r => r.total_score!);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const bestScore = Math.min(...scores);
    courseHistory = {
      courseName: round.course_name,
      roundCount: courseRounds.length,
      avgScore: Math.round(avgScore * 10) / 10,
      bestScore,
      thisScore: score,
      vsAvg: Math.round((score - avgScore) * 10) / 10,
    };
    if (score < bestScore) {
      insights.push({
        category: 'positive', area: 'Course History',
        title: 'New Personal Best Here!',
        detail: `Beat your previous best of ${bestScore} at ${round.course_name}.`,
        casualDetail: `This is your best score ever at ${round.course_name}! You beat your old best of ${bestScore}.`,
        impact: 'high',
      });
    } else if (courseHistory.vsAvg <= -3) {
      insights.push({
        category: 'positive', area: 'Course History',
        title: 'Well Below Your Course Average',
        detail: `Shot ${Math.abs(courseHistory.vsAvg)} strokes below your average of ${courseHistory.avgScore} here.`,
        casualDetail: `You usually shoot around ${courseHistory.avgScore} here — today was ${Math.abs(courseHistory.vsAvg)} shots better!`,
        impact: 'high',
      });
    } else if (courseHistory.vsAvg >= 5) {
      insights.push({
        category: 'negative', area: 'Course History',
        title: 'Above Your Course Average',
        detail: `Shot ${courseHistory.vsAvg} strokes above your average of ${courseHistory.avgScore} here.`,
        casualDetail: `You normally shoot about ${courseHistory.avgScore} here — today was a tougher day.`,
        impact: 'medium',
      });
    }
  }

  // Compare to recent average (all courses)
  const recentScores = recentRounds.filter(r => r.total_score != null).map(r => r.total_score!);
  if (recentScores.length >= 3) {
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const diff = score - recentAvg;
    if (diff <= -3) {
      insights.push({
        category: 'positive', area: 'Scoring', title: 'Well Below Your Average',
        detail: `Shot ${Math.abs(diff).toFixed(1)} strokes better than your recent average of ${recentAvg.toFixed(1)}.`,
        casualDetail: `You usually shoot around ${recentAvg.toFixed(0)} — today was ${Math.abs(diff).toFixed(0)} shots better!`,
        impact: 'high',
      });
    } else if (diff >= 5) {
      insights.push({
        category: 'negative', area: 'Scoring', title: 'Above Your Average',
        detail: `Shot ${diff.toFixed(1)} strokes above your recent average of ${recentAvg.toFixed(1)}.`,
        casualDetail: `A bit off your usual game — you normally shoot around ${recentAvg.toFixed(0)}.`,
        impact: 'medium',
      });
    }
  }

  // ── SG Category Insights ────────────────────────────────
  const sgCategories = [
    { key: 'sgPutting', label: 'Putting', val: analysis.sgPutting },
    { key: 'sgApproach', label: 'Approach', val: analysis.sgApproach },
    { key: 'sgShortGame', label: 'Short Game', val: analysis.sgShortGame },
    { key: 'sgOtt', label: 'Off the Tee', val: analysis.sgOtt },
  ];

  const sorted = [...sgCategories].sort((a, b) => b.val - a.val);

  if (sorted[0].val > 0.5) {
    insights.push({
      category: 'positive', area: sorted[0].label,
      title: `${sorted[0].label} Was Your Strength`,
      detail: `Gained ${sorted[0].val.toFixed(1)} strokes in ${sorted[0].label.toLowerCase()}.`,
      casualDetail: `Your ${sorted[0].label.toLowerCase()} was really working today — one of your best areas.`,
      impact: 'high',
    });
    strengths.push(sorted[0].label);
  }
  if (sorted[1].val > 0) strengths.push(sorted[1].label);

  if (sorted[sorted.length - 1].val < -0.5) {
    const worst = sorted[sorted.length - 1];
    insights.push({
      category: 'negative', area: worst.label,
      title: `${worst.label} Held You Back`,
      detail: `Lost ${Math.abs(worst.val).toFixed(1)} strokes in ${worst.label.toLowerCase()}.`,
      casualDetail: `${worst.label} was the toughest part of your game today. A little improvement here makes a big difference.`,
      impact: 'high',
    });
    improvementAreas.push(worst.label);

    const drillMap: Record<string, { action: string; link: string; linkLabel: string }> = {
      'Putting': {
        action: 'Focus on lag putting drills and 3-6ft makes',
        link: '/putters', linkLabel: 'Open Putter Lab',
      },
      'Approach': {
        action: 'Work on scoring zone wedges (50-120yd) and iron accuracy',
        link: '/wedges', linkLabel: 'Open Wedge Lab',
      },
      'Short Game': {
        action: 'Practice up-and-downs from various lies around the green',
        link: '/practice/timed?category=short_game', linkLabel: 'Start Short Game Drill',
      },
      'Off the Tee': {
        action: 'Focus on driver accuracy — pick smaller targets on the range',
        link: '/practice/timed?category=full_swing', linkLabel: 'Start Full Swing Drill',
      },
    };
    const drill = drillMap[worst.label];
    actionItems.push({
      priority: 1, area: worst.label,
      action: drill?.action ?? `Dedicate extra practice time to ${worst.label.toLowerCase()}`,
      practiceLink: drill?.link, practiceLinkLabel: drill?.linkLabel,
    });
  }
  if (sorted[sorted.length - 2]?.val < 0) {
    improvementAreas.push(sorted[sorted.length - 2].label);
  }

  // ── Specific Stat Insights ──────────────────────────────

  if (analysis.threePuttCount >= 3) {
    insights.push({
      category: 'negative', area: 'Putting',
      title: `${analysis.threePuttCount} Three-Putts`,
      detail: `Three-putts cost ~${(analysis.threePuttCount * 0.8).toFixed(1)} strokes. Focus on lag distance control.`,
      casualDetail: `${analysis.threePuttCount} three-putts today — that's a lot of extra strokes. Getting your first putt closer would help a lot.`,
      impact: 'high',
    });
    actionItems.push({
      priority: 2, area: 'Putting',
      action: 'Lag putting drill: putt to 20/30/40ft, all within 3ft circle',
      practiceLink: '/putters', practiceLinkLabel: 'Open Putter Lab',
    });
  } else if (analysis.threePuttCount === 0 && analysis.totalPutts > 0) {
    insights.push({
      category: 'positive', area: 'Putting',
      title: 'Zero Three-Putts',
      detail: 'Great speed control — no three-putts today.',
      casualDetail: 'No three-putts! Your distance control on the greens was solid.',
      impact: 'medium',
    });
  }

  if (analysis.onePuttCount >= 6) {
    insights.push({
      category: 'positive', area: 'Putting',
      title: `${analysis.onePuttCount} One-Putts`,
      detail: 'Excellent on the greens with many one-putts.',
      casualDetail: `${analysis.onePuttCount} one-putts — you were draining everything today!`,
      impact: 'medium',
    });
  }

  if (analysis.girPct >= 50) {
    insights.push({
      category: 'positive', area: 'Approach',
      title: `${analysis.girPct}% Greens in Regulation`,
      detail: `Hit ${analysis.girCount} greens — giving yourself birdie looks.`,
      casualDetail: `You reached the green in the expected number of shots on ${analysis.girCount} holes. That gives you more birdie chances.`,
      impact: 'medium',
    });
  } else if (analysis.girPct < 20) {
    insights.push({
      category: 'negative', area: 'Approach',
      title: `Only ${analysis.girPct}% GIR`,
      detail: `Only ${analysis.girCount} greens hit. Iron accuracy is the biggest scoring lever.`,
      casualDetail: `You only reached the green "on time" ${analysis.girCount} times. Better iron shots = easier pars.`,
      impact: 'high',
    });
    actionItems.push({
      priority: 2, area: 'Approach',
      action: 'Stock shot drill with mid-irons — build consistent contact',
      practiceLink: '/practice/timed?category=full_swing', practiceLinkLabel: 'Start Iron Drill',
    });
  }

  if (analysis.firPct >= 65) {
    insights.push({
      category: 'positive', area: 'Off the Tee',
      title: `${analysis.firPct}% Fairways`,
      detail: `Hit ${analysis.firCount}/${analysis.firHoles} fairways — keeping it in play.`,
      casualDetail: `You found the fairway ${analysis.firCount} out of ${analysis.firHoles} times — nice driving!`,
      impact: 'medium',
    });
  } else if (analysis.firPct < 30 && analysis.firHoles > 0) {
    insights.push({
      category: 'negative', area: 'Off the Tee',
      title: `Only ${analysis.firPct}% Fairways`,
      detail: 'Missing fairways makes approach shots much harder.',
      casualDetail: `Only ${analysis.firCount} out of ${analysis.firHoles} fairways hit. Being in the rough or trees makes the next shot much harder.`,
      impact: 'medium',
    });
  }

  if (analysis.upAndDownPct >= 50 && analysis.upAndDownAttempts >= 3) {
    insights.push({
      category: 'positive', area: 'Short Game',
      title: `${analysis.upAndDownPct}% Up & Down`,
      detail: `Saved par ${analysis.upAndDownMade} of ${analysis.upAndDownAttempts} times — great scrambling.`,
      casualDetail: `When you missed the green, you still saved par ${analysis.upAndDownMade} times. That's great scrambling!`,
      impact: 'medium',
    });
  } else if (analysis.upAndDownPct < 20 && analysis.upAndDownAttempts >= 3) {
    insights.push({
      category: 'negative', area: 'Short Game',
      title: `Only ${analysis.upAndDownPct}% Up & Down`,
      detail: `Converted only ${analysis.upAndDownMade} of ${analysis.upAndDownAttempts} scramble chances.`,
      casualDetail: `When you missed the green, you only saved par ${analysis.upAndDownMade} out of ${analysis.upAndDownAttempts} times. Chipping closer would help.`,
      impact: 'medium',
    });
    actionItems.push({
      priority: 3, area: 'Short Game',
      action: 'Practice chip-and-pitch proximity from 10-30 yards',
      practiceLink: '/practice/timed?category=short_game', practiceLinkLabel: 'Start Short Game Drill',
    });
  }

  if (analysis.totalPenalties >= 3) {
    insights.push({
      category: 'negative', area: 'Course Management',
      title: `${analysis.totalPenalties} Penalty Strokes`,
      detail: `Penalties cost ${analysis.totalPenalties} strokes. Consider more conservative targets.`,
      casualDetail: `${analysis.totalPenalties} penalty strokes today — that's like giving away ${analysis.totalPenalties} free shots. Playing safer off the tee can help.`,
      impact: 'high',
    });
    actionItems.push({
      priority: 2, area: 'Course Management',
      action: 'Pre-shot routine: identify the safe miss before every tee shot',
    });
  }

  // ── Hole Highlights ─────────────────────────────────────
  const holeHighlights: HoleHighlight[] = [];
  const holeSGs = analysis.holes;

  for (const h of holes) {
    if (h.score == null) continue;
    const rel = h.score - h.par;

    if (rel <= -1) {
      holeHighlights.push({
        holeNumber: h.hole_number, par: h.par, score: h.score,
        type: 'birdie',
        detail: `Birdie${rel <= -2 ? ' or better' : ''} on the par ${h.par}. ${h.putts === 1 ? 'One-putted!' : ''}`,
      });
    }
    if (rel >= 2) {
      holeHighlights.push({
        holeNumber: h.hole_number, par: h.par, score: h.score,
        type: 'double_plus',
        detail: `Double bogey+ (${h.score}). ${h.penalty_strokes > 0 ? `${h.penalty_strokes} penalty.` : ''} ${h.putts && h.putts >= 3 ? 'Three-putted.' : ''}`,
      });
    }
    if (h.putts != null && h.putts >= 3) {
      if (!holeHighlights.some(hh => hh.holeNumber === h.hole_number && hh.type === 'double_plus')) {
        holeHighlights.push({
          holeNumber: h.hole_number, par: h.par, score: h.score,
          type: 'three_putt',
          detail: `Three-putt on hole ${h.hole_number}. Work on lag distance.`,
        });
      }
    }
  }

  if (holeSGs.length > 0) {
    const bestHole = [...holeSGs].sort((a, b) => b.sgTotal - a.sgTotal)[0];
    const worstHole = [...holeSGs].sort((a, b) => a.sgTotal - b.sgTotal)[0];

    if (bestHole.sgTotal > 0.5 && !holeHighlights.some(h => h.holeNumber === bestHole.holeNumber)) {
      holeHighlights.push({
        holeNumber: bestHole.holeNumber, par: bestHole.par, score: bestHole.score,
        type: 'best',
        detail: `Best hole: gained ${bestHole.sgTotal.toFixed(1)} strokes vs benchmark.`,
      });
    }
    if (worstHole.sgTotal < -1 && !holeHighlights.some(h => h.holeNumber === worstHole.holeNumber)) {
      holeHighlights.push({
        holeNumber: worstHole.holeNumber, par: worstHole.par, score: worstHole.score,
        type: 'worst',
        detail: `Worst hole: lost ${Math.abs(worstHole.sgTotal).toFixed(1)} strokes vs benchmark.`,
      });
    }
  }

  holeHighlights.sort((a, b) => a.holeNumber - b.holeNumber);

  // ── Scoring Patterns ────────────────────────────────────
  const scoringPatterns: ScoringPattern[] = [];

  for (const parVal of [3, 4, 5]) {
    const parHoles = holes.filter(h => h.par === parVal && h.score != null);
    if (parHoles.length === 0) continue;
    const avgOverPar = parHoles.reduce((s, h) => s + (h.score! - h.par), 0) / parHoles.length;
    scoringPatterns.push({
      label: `Par ${parVal}s`,
      value: avgOverPar >= 0 ? `+${avgOverPar.toFixed(1)}` : avgOverPar.toFixed(1),
      context: `${parHoles.length} holes`,
      trend: avgOverPar <= 0.3 ? 'good' : avgOverPar >= 1.5 ? 'bad' : 'neutral',
    });
  }

  const front = holes.filter(h => h.hole_number <= 9 && h.score != null);
  const back = holes.filter(h => h.hole_number > 9 && h.score != null);
  if (front.length > 0 && back.length > 0) {
    const frontScore = front.reduce((s, h) => s + h.score!, 0);
    const backScore = back.reduce((s, h) => s + h.score!, 0);
    const frontPar = front.reduce((s, h) => s + h.par, 0);
    const backPar = back.reduce((s, h) => s + h.par, 0);
    scoringPatterns.push({
      label: 'Front 9',
      value: `${frontScore} (${frontScore - frontPar >= 0 ? '+' : ''}${frontScore - frontPar})`,
      context: `Par ${frontPar}`,
      trend: frontScore - frontPar <= 2 ? 'good' : frontScore - frontPar >= 8 ? 'bad' : 'neutral',
    });
    scoringPatterns.push({
      label: 'Back 9',
      value: `${backScore} (${backScore - backPar >= 0 ? '+' : ''}${backScore - backPar})`,
      context: `Par ${backPar}`,
      trend: backScore - backPar <= 2 ? 'good' : backScore - backPar >= 8 ? 'bad' : 'neutral',
    });
  }

  const doubleOrWorse = holes.filter(h => h.score != null && h.score - h.par >= 2);
  if (doubleOrWorse.length > 0) {
    const bounceBackCount = doubleOrWorse.filter(h => {
      const next = holes.find(nh => nh.hole_number === h.hole_number + 1);
      return next && next.score != null && next.score <= next.par;
    }).length;
    scoringPatterns.push({
      label: 'Bounce-Back',
      value: `${bounceBackCount}/${doubleOrWorse.length}`,
      context: 'Par or better after double+',
      trend: bounceBackCount >= doubleOrWorse.length * 0.5 ? 'good' : 'bad',
    });
  }

  // ── What-If Analysis ──────────────────────────────────
  const whatIfs: WhatIf[] = [];

  // What if no three-putts?
  if (analysis.threePuttCount > 0) {
    const saved = analysis.threePuttCount; // Each three-putt = ~1 extra stroke
    whatIfs.push({
      label: 'Eliminate three-putts',
      savedStrokes: saved,
      hypotheticalScore: score - saved,
    });
  }

  // What if no penalties?
  if (analysis.totalPenalties > 0) {
    whatIfs.push({
      label: 'Eliminate penalties',
      savedStrokes: analysis.totalPenalties,
      hypotheticalScore: score - analysis.totalPenalties,
    });
  }

  // What if doubles became bogeys?
  const doublesOrWorse = holes.filter(h => h.score != null && h.score - h.par >= 2);
  if (doublesOrWorse.length > 0) {
    const extraStrokes = doublesOrWorse.reduce((s, h) => s + (h.score! - h.par - 1), 0);
    whatIfs.push({
      label: 'Cap doubles at bogey',
      savedStrokes: extraStrokes,
      hypotheticalScore: score - extraStrokes,
    });
  }

  // What if 50% up-and-down?
  if (analysis.upAndDownAttempts > 0 && analysis.upAndDownPct < 50) {
    const targetMakes = Math.ceil(analysis.upAndDownAttempts * 0.5);
    const extraSaves = targetMakes - analysis.upAndDownMade;
    if (extraSaves > 0) {
      whatIfs.push({
        label: 'Scramble at 50%',
        savedStrokes: extraSaves,
        hypotheticalScore: score - extraSaves,
      });
    }
  }

  actionItems.sort((a, b) => a.priority - b.priority);

  return {
    round, analysis, overallVerdict, overallEmoji,
    insights, actionItems, holeHighlights, scoringPatterns,
    strengths, improvementAreas, whatIfs, courseHistory,
  };
}
