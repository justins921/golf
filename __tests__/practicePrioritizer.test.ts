import { generatePracticeReport, sgToWeakAreas } from '../src/lib/practicePrioritizer';
import { analyzeRound } from '../src/lib/strokesGained';
import type { Round, RoundHole } from '../src/lib/types';

describe('generatePracticeReport', () => {
  const makeRound = (): Round => ({
    id: 'test-round',
    user_id: 'user1',
    round_date: '2026-03-01',
    course_name: 'Test Course',
    tees: 'Blue',
    holes_played: 18,
    total_score: 96,
    total_putts: 43,
    total_fairways_hit: 7,
    total_fairways: 14,
    total_gir: 5,
    total_penalties: 2,
    notes: null,
    created_at: '2026-03-01',
  });

  // A bad round: high score, lots of putts, missed fairways, penalties
  const makeBadHoles = (): RoundHole[] =>
    Array.from({ length: 18 }, (_, i) => ({
      id: `hole-${i + 1}`,
      round_id: 'test-round',
      hole_number: i + 1,
      par: i % 4 === 0 ? 3 : i % 4 === 3 ? 5 : 4,
      score: i % 4 === 0 ? 4 : i % 4 === 3 ? 7 : 6,
      putts: i % 3 === 0 ? 3 : 2, // three-putt every 3rd hole
      fairway_hit: i % 4 !== 0 ? i % 3 === 0 : null,
      gir: i < 5, // only 5 GIR
      up_and_down: i >= 5 ? (i % 4 === 1) : null,
      sand_save: null,
      penalty_strokes: i === 3 || i === 12 ? 1 : 0,
      club_off_tee: null,
      approach_distance_yd: null,
      notes: null,
      created_at: '2026-03-01',
    }));

  it('generates recommendations for a bad round', () => {
    const round = makeRound();
    const holes = makeBadHoles();
    const analysis = analyzeRound(round, holes, 10);
    const report = generatePracticeReport(analysis, round.round_date, round.course_name, round.total_score!);

    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.biggestOpportunity).toBeDefined();
    expect(report.summary).toContain('Putting');
  });

  it('priorities are numbered sequentially', () => {
    const round = makeRound();
    const holes = makeBadHoles();
    const analysis = analyzeRound(round, holes, 10);
    const report = generatePracticeReport(analysis, round.round_date, round.course_name, round.total_score!);

    report.recommendations.forEach((rec, i) => {
      expect(rec.priority).toBe(i + 1);
    });
  });

  it('includes drill suggestions', () => {
    const round = makeRound();
    const holes = makeBadHoles();
    const analysis = analyzeRound(round, holes, 10);
    const report = generatePracticeReport(analysis, round.round_date, round.course_name, round.total_score!);

    for (const rec of report.recommendations) {
      expect(rec.drillSuggestions.length).toBeGreaterThan(0);
      expect(rec.tip).toBeDefined();
      expect(rec.benchmarkComparison).toBeDefined();
    }
  });

  it('detects three-putt problem', () => {
    const round = makeRound();
    const holes = makeBadHoles();
    const analysis = analyzeRound(round, holes, 10);
    const report = generatePracticeReport(analysis, round.round_date, round.course_name, round.total_score!);

    const threePuttRec = report.recommendations.find((r) => r.title === 'Eliminate Three-Putts');
    expect(threePuttRec).toBeDefined();
  });

  it('detects penalty problem', () => {
    const round = makeRound();
    const holes = makeBadHoles();
    const analysis = analyzeRound(round, holes, 10);
    const report = generatePracticeReport(analysis, round.round_date, round.course_name, round.total_score!);

    const penaltyRec = report.recommendations.find((r) => r.title === 'Reduce Penalty Strokes');
    expect(penaltyRec).toBeDefined();
  });
});

describe('sgToWeakAreas', () => {
  it('maps recommendations to drill categories', () => {
    const round: Round = {
      id: 'test', user_id: 'u', round_date: '2026-03-01', course_name: 'Test',
      tees: null, holes_played: 18, total_score: 96, total_putts: 40,
      total_fairways_hit: 5, total_fairways: 14, total_gir: 4,
      total_penalties: 1, notes: null, created_at: '2026-03-01',
    };
    const holes: RoundHole[] = Array.from({ length: 18 }, (_, i) => ({
      id: `h-${i}`, round_id: 'test', hole_number: i + 1,
      par: 4, score: 5, putts: 2, fairway_hit: i % 2 === 0,
      gir: false, up_and_down: false, sand_save: null,
      penalty_strokes: 0, club_off_tee: null,
      approach_distance_yd: null, notes: null, created_at: '2026-03-01',
    }));

    const analysis = analyzeRound(round, holes, 15);
    const report = generatePracticeReport(analysis, round.round_date, round.course_name, round.total_score!);
    const weakAreas = sgToWeakAreas(report, 2);

    expect(weakAreas.length).toBeLessThanOrEqual(2);
    for (const area of weakAreas) {
      expect(['putting', 'short_game', 'full_swing', 'wedges']).toContain(area.category);
      expect(area.reason).toBeDefined();
    }
  });
});
