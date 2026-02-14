import type { ClubStats, Recommendation, PracticePlan } from './types';

interface RecommendationInput {
  currentHandicap: number;
  goalHandicap: number;
  clubStats: ClubStats[];
}

/**
 * Generate prioritized recommendations based on club stats and handicap goals.
 *
 * Evaluates:
 * - Lateral bias (mean lateral deviation)
 * - Lateral spread (σ lateral)
 * - Distance spread (σ distance)
 * - Pattern area
 * - Target error (when target data exists)
 */
export function generateRecommendations(input: RecommendationInput): Recommendation[] {
  const { currentHandicap, goalHandicap, clubStats } = input;
  const handicapGap = currentHandicap - goalHandicap;
  const recommendations: Recommendation[] = [];

  // Thresholds scale with handicap goal
  const biasThreshold = goalHandicap < 5 ? 4 : goalHandicap < 10 ? 6 : 8;
  const sdLateralThreshold = goalHandicap < 5 ? 6 : goalHandicap < 10 ? 10 : 14;
  const sdDistanceThreshold = goalHandicap < 5 ? 5 : goalHandicap < 10 ? 8 : 12;
  const targetErrorThreshold = goalHandicap < 5 ? 5 : goalHandicap < 10 ? 8 : 12;
  const targetSdThreshold = goalHandicap < 5 ? 6 : goalHandicap < 10 ? 9 : 14;
  const areaThresholdMultiplier = goalHandicap < 5 ? 0.7 : goalHandicap < 10 ? 1.0 : 1.3;

  for (const club of clubStats) {
    if (club.n < 5) continue; // Not enough data

    const stats = club.carry; // Use carry stats for recommendations

    // 1. Lateral bias
    const absBias = Math.abs(stats.meanLateral);
    if (absBias > biasThreshold) {
      const direction = stats.meanLateral > 0 ? 'right' : 'left';
      recommendations.push({
        priority: 0,
        clubName: club.clubName,
        issue: `${club.clubName}: Significant ${direction} bias of ${absBias.toFixed(1)} yards`,
        metric: 'carry.meanLateral',
        value: stats.meanLateral,
        threshold: biasThreshold,
        suggestion: `Work on path correction for your ${club.clubName}. Your shots consistently miss ${direction} by ${absBias.toFixed(1)} yards. Focus on alignment drills and swing path checks.`,
      });
    }

    // 2. Lateral spread
    if (stats.sdLateral > sdLateralThreshold) {
      recommendations.push({
        priority: 0,
        clubName: club.clubName,
        issue: `${club.clubName}: High lateral spread (σ=${stats.sdLateral.toFixed(1)} yd)`,
        metric: 'carry.sdLateral',
        value: stats.sdLateral,
        threshold: sdLateralThreshold,
        suggestion: `Your ${club.clubName} has inconsistent direction (±${stats.sdLateral.toFixed(1)} yd). Focus on face control at impact. Gate drills and impact tape can help identify the pattern.`,
      });
    }

    // 3. Distance spread
    if (stats.sdDistance > sdDistanceThreshold) {
      recommendations.push({
        priority: 0,
        clubName: club.clubName,
        issue: `${club.clubName}: High distance spread (σ=${stats.sdDistance.toFixed(1)} yd)`,
        metric: 'carry.sdDistance',
        value: stats.sdDistance,
        threshold: sdDistanceThreshold,
        suggestion: `Your ${club.clubName} distance varies by ±${stats.sdDistance.toFixed(1)} yards. Focus on consistent strike quality—centered contact drills and tempo work will help.`,
      });
    }

    // 4. Pattern area (1σ ellipse)
    const areaThreshold = 150 * areaThresholdMultiplier; // sq yards
    if (stats.patternArea1Sigma > areaThreshold) {
      recommendations.push({
        priority: 0,
        clubName: club.clubName,
        issue: `${club.clubName}: Large dispersion pattern (${stats.patternArea1Sigma.toFixed(0)} sq yd)`,
        metric: 'carry.patternArea1Sigma',
        value: stats.patternArea1Sigma,
        threshold: areaThreshold,
        suggestion: `Your ${club.clubName} dispersion is wide. Tighten your pattern by focusing on repeatable setup, grip pressure, and tempo.`,
      });
    }

    // 5. Target error (if available)
    if (club.targetStats) {
      const ts = club.targetStats;
      const absTargetErr = Math.abs(ts.meanError);
      if (absTargetErr > targetErrorThreshold) {
        const direction = ts.meanError > 0 ? 'long' : 'short';
        recommendations.push({
          priority: 0,
          clubName: club.clubName,
          issue: `${club.clubName}: Avg ${absTargetErr.toFixed(1)} yd ${direction} of target`,
          metric: 'targetStats.meanError',
          value: ts.meanError,
          threshold: targetErrorThreshold,
          suggestion: `Your ${club.clubName} lands an average of ${absTargetErr.toFixed(1)} yards ${direction}. ${
            direction === 'long'
              ? 'Consider clubbing down or working on partial shots.'
              : 'This may indicate a strike issue—check impact location and launch angle.'
          }`,
        });
      }

      if (ts.sdError > targetSdThreshold) {
        recommendations.push({
          priority: 0,
          clubName: club.clubName,
          issue: `${club.clubName}: Target error inconsistency (σ=${ts.sdError.toFixed(1)} yd)`,
          metric: 'targetStats.sdError',
          value: ts.sdError,
          threshold: targetSdThreshold,
          suggestion: `Even when targeting a specific distance with your ${club.clubName}, results vary by ±${ts.sdError.toFixed(1)} yards. Focus on stock shot consistency before distance control.`,
        });
      }

      if (ts.pctWithin10 < 0.5) {
        recommendations.push({
          priority: 0,
          clubName: club.clubName,
          issue: `${club.clubName}: Only ${(ts.pctWithin10 * 100).toFixed(0)}% within ±10 yd of target`,
          metric: 'targetStats.pctWithin10',
          value: ts.pctWithin10,
          threshold: 0.5,
          suggestion: `Less than half your ${club.clubName} shots land within 10 yards of your target. This is a significant distance control gap. Practice with specific distance targets and track your progress.`,
        });
      }
    }
  }

  // Score and prioritize
  recommendations.forEach((r) => {
    // Priority based on: how much the metric exceeds threshold + club importance
    const severity = Math.abs(r.value) / r.threshold;
    // Weight irons and wedges higher (they're scoring clubs)
    const isScoring = r.clubName.includes('Iron') || r.clubName.includes('W') || r.clubName.includes('Wedge');
    const clubWeight = isScoring ? 1.5 : 1.0;
    r.priority = severity * clubWeight * (1 + handicapGap * 0.1);
  });

  recommendations.sort((a, b) => b.priority - a.priority);
  return recommendations.slice(0, 10);
}

/**
 * Generate a 15-minute practice plan based on top 2 issues.
 */
export function generatePracticePlan(recommendations: Recommendation[]): PracticePlan | null {
  if (recommendations.length === 0) return null;

  const top = recommendations.slice(0, 2);
  const drills: PracticePlan['drills'] = [];

  for (const rec of top) {
    if (rec.metric.includes('meanLateral') || rec.metric.includes('sdLateral')) {
      drills.push({
        name: `${rec.clubName} – Alignment & Path`,
        description: `Set alignment sticks. Hit 10 shots focusing on face control. Target: center of pattern within ${rec.threshold} yards.`,
        duration: '7 min',
      });
    } else if (rec.metric.includes('sdDistance')) {
      drills.push({
        name: `${rec.clubName} – Tempo & Strike`,
        description: `Hit 10 shots at 80% effort focusing on center-face contact. Use impact tape if available. Target: reduce distance spread.`,
        duration: '7 min',
      });
    } else if (rec.metric.includes('targetStats')) {
      drills.push({
        name: `${rec.clubName} – Distance Control`,
        description: `Pick a specific target distance. Hit 10 shots trying to land within 10 yards. Track your success rate.`,
        duration: '7 min',
      });
    } else if (rec.metric.includes('patternArea')) {
      drills.push({
        name: `${rec.clubName} – Pattern Tightening`,
        description: `Hit 10 shots with your normal routine. Focus on setup consistency and pre-shot routine. Track dispersion.`,
        duration: '7 min',
      });
    }
  }

  if (drills.length === 1) {
    drills.push({
      name: 'General – Short Game Touch',
      description: 'Spend the remaining time on 30-50 yard pitch shots. Focus on landing spot accuracy.',
      duration: '7 min',
    });
  }

  return {
    title: '15-Minute Focused Practice',
    duration: '15 min',
    drills: [
      { name: 'Warm-up', description: 'Hit 5 easy wedge shots to loosen up.', duration: '1 min' },
      ...drills,
    ],
  };
}
