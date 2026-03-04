import type { Round, RoundHole } from './types';
import { analyzeRound, type RoundSGAnalysis, type HoleSG } from './strokesGained';

// ── Types ───────────────────────────────────────────────────

export interface DebriefInsight {
  category: 'positive' | 'negative' | 'neutral';
  area: string; // SG category or stat area
  title: string;
  detail: string;
  impact: 'high' | 'medium' | 'low';
}

export interface DebriefActionItem {
  priority: number; // 1 = highest
  area: string;
  action: string;
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
}

// ── Generator ───────────────────────────────────────────────

export function generateDebrief(
  round: Round,
  holes: RoundHole[],
  recentRounds: Round[],
  handicap: number = 15,
): RoundDebrief {
  const analysis = analyzeRound(round, holes, handicap);
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

  // Compare to recent average
  const recentScores = recentRounds.filter(r => r.total_score != null).map(r => r.total_score!);
  if (recentScores.length >= 3) {
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const diff = score - recentAvg;
    if (diff <= -3) {
      insights.push({
        category: 'positive', area: 'scoring', title: 'Well Below Your Average',
        detail: `Shot ${Math.abs(diff).toFixed(1)} strokes better than your recent average of ${recentAvg.toFixed(1)}.`,
        impact: 'high',
      });
    } else if (diff >= 5) {
      insights.push({
        category: 'negative', area: 'scoring', title: 'Above Your Average',
        detail: `Shot ${diff.toFixed(1)} strokes above your recent average of ${recentAvg.toFixed(1)}.`,
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

  // Sort by SG value — best first
  const sorted = [...sgCategories].sort((a, b) => b.val - a.val);

  // Best category
  if (sorted[0].val > 0.5) {
    insights.push({
      category: 'positive', area: sorted[0].label, title: `${sorted[0].label} Was Your Strength`,
      detail: `Gained ${sorted[0].val.toFixed(1)} strokes in ${sorted[0].label.toLowerCase()}.`,
      impact: 'high',
    });
    strengths.push(sorted[0].label);
  }
  if (sorted[1].val > 0) {
    strengths.push(sorted[1].label);
  }

  // Worst category
  if (sorted[sorted.length - 1].val < -0.5) {
    const worst = sorted[sorted.length - 1];
    insights.push({
      category: 'negative', area: worst.label, title: `${worst.label} Held You Back`,
      detail: `Lost ${Math.abs(worst.val).toFixed(1)} strokes in ${worst.label.toLowerCase()}.`,
      impact: 'high',
    });
    improvementAreas.push(worst.label);

    // Action item for worst area
    const drillMap: Record<string, string> = {
      'Putting': 'Focus on lag putting drills and 3-6ft makes',
      'Approach': 'Work on scoring zone wedges (50-120yd) and iron accuracy',
      'Short Game': 'Practice up-and-downs from various lies around the green',
      'Off the Tee': 'Focus on driver accuracy — pick smaller targets on the range',
    };
    actionItems.push({
      priority: 1, area: worst.label,
      action: drillMap[worst.label] ?? `Dedicate extra practice time to ${worst.label.toLowerCase()}`,
    });
  }
  if (sorted[sorted.length - 2]?.val < 0) {
    improvementAreas.push(sorted[sorted.length - 2].label);
  }

  // ── Specific Stat Insights ──────────────────────────────

  // Putting
  if (analysis.threePuttCount >= 3) {
    insights.push({
      category: 'negative', area: 'Putting', title: `${analysis.threePuttCount} Three-Putts`,
      detail: `Three-putts cost ~${(analysis.threePuttCount * 0.8).toFixed(1)} strokes. Focus on lag distance control.`,
      impact: 'high',
    });
    actionItems.push({
      priority: 2, area: 'Putting',
      action: 'Lag putting drill: putt to 20/30/40ft, all within 3ft circle',
      drillSuggestion: 'drill-lag-putting',
    });
  } else if (analysis.threePuttCount === 0 && analysis.totalPutts > 0) {
    insights.push({
      category: 'positive', area: 'Putting', title: 'Zero Three-Putts',
      detail: 'Great speed control — no three-putts today.',
      impact: 'medium',
    });
  }

  if (analysis.onePuttCount >= 6) {
    insights.push({
      category: 'positive', area: 'Putting', title: `${analysis.onePuttCount} One-Putts`,
      detail: 'Excellent on the greens with many one-putts.',
      impact: 'medium',
    });
  }

  // GIR
  if (analysis.girPct >= 50) {
    insights.push({
      category: 'positive', area: 'Approach', title: `${analysis.girPct}% Greens in Regulation`,
      detail: `Hit ${analysis.girCount} greens — giving yourself birdie looks.`,
      impact: 'medium',
    });
  } else if (analysis.girPct < 20) {
    insights.push({
      category: 'negative', area: 'Approach', title: `Only ${analysis.girPct}% GIR`,
      detail: `Only ${analysis.girCount} greens hit. Iron accuracy is the biggest scoring lever.`,
      impact: 'high',
    });
    actionItems.push({
      priority: 2, area: 'Approach',
      action: 'Stock shot drill with mid-irons — build consistent contact',
      drillSuggestion: 'drill-stock-shot',
    });
  }

  // FIR
  if (analysis.firPct >= 65) {
    insights.push({
      category: 'positive', area: 'Off the Tee', title: `${analysis.firPct}% Fairways`,
      detail: `Hit ${analysis.firCount}/${analysis.firHoles} fairways — keeping it in play.`,
      impact: 'medium',
    });
  } else if (analysis.firPct < 30 && analysis.firHoles > 0) {
    insights.push({
      category: 'negative', area: 'Off the Tee', title: `Only ${analysis.firPct}% Fairways`,
      detail: `Missing fairways makes approach shots much harder.`,
      impact: 'medium',
    });
  }

  // Up & Down
  if (analysis.upAndDownPct >= 50 && analysis.upAndDownAttempts >= 3) {
    insights.push({
      category: 'positive', area: 'Short Game', title: `${analysis.upAndDownPct}% Up & Down`,
      detail: `Saved par ${analysis.upAndDownMade} of ${analysis.upAndDownAttempts} times — great scrambling.`,
      impact: 'medium',
    });
  } else if (analysis.upAndDownPct < 20 && analysis.upAndDownAttempts >= 3) {
    insights.push({
      category: 'negative', area: 'Short Game', title: `Only ${analysis.upAndDownPct}% Up & Down`,
      detail: `Converted only ${analysis.upAndDownMade} of ${analysis.upAndDownAttempts} scramble chances.`,
      impact: 'medium',
    });
    actionItems.push({
      priority: 3, area: 'Short Game',
      action: 'Practice chip-and-pitch proximity from 10-30 yards',
      drillSuggestion: 'drill-pitch-chip',
    });
  }

  // Penalties
  if (analysis.totalPenalties >= 3) {
    insights.push({
      category: 'negative', area: 'Course Management', title: `${analysis.totalPenalties} Penalty Strokes`,
      detail: `Penalties cost ${analysis.totalPenalties} strokes. Consider more conservative targets.`,
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

  // Best and worst holes by SG
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

  // Par 3/4/5 breakdown
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

  // Front/back split
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

  // Bounce-back rate
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

  // Sort action items by priority
  actionItems.sort((a, b) => a.priority - b.priority);

  return {
    round, analysis, overallVerdict, overallEmoji,
    insights, actionItems, holeHighlights, scoringPatterns,
    strengths, improvementAreas,
  };
}
