import {
  expectedPutts,
  getBenchmark,
  analyzeRound,
} from '../src/lib/strokesGained';
import type { Round, RoundHole } from '../src/lib/types';

describe('expectedPutts', () => {
  it('returns 0 for 0 distance', () => {
    expect(expectedPutts(0)).toBe(0);
  });

  it('returns 1.0 for tap-in (1 ft)', () => {
    expect(expectedPutts(1)).toBe(1.0);
  });

  it('returns reasonable values for common distances', () => {
    // 3ft should be around 1.3-1.5
    expect(expectedPutts(3)).toBeGreaterThan(1.2);
    expect(expectedPutts(3)).toBeLessThan(1.6);

    // 10ft should be around 1.7-1.9
    expect(expectedPutts(10)).toBeGreaterThan(1.6);
    expect(expectedPutts(10)).toBeLessThan(2.0);

    // 30ft should be around 2.0-2.3
    expect(expectedPutts(30)).toBeGreaterThan(1.9);
    expect(expectedPutts(30)).toBeLessThan(2.4);

    // 60ft should be around 2.3-2.6
    expect(expectedPutts(60)).toBeGreaterThan(2.2);
    expect(expectedPutts(60)).toBeLessThan(2.7);
  });

  it('increases monotonically with distance', () => {
    const distances = [1, 3, 5, 10, 15, 20, 30, 40, 60];
    for (let i = 1; i < distances.length; i++) {
      expect(expectedPutts(distances[i])).toBeGreaterThan(expectedPutts(distances[i - 1]));
    }
  });
});

describe('getBenchmark', () => {
  it('returns scratch benchmark for 0 handicap', () => {
    const b = getBenchmark(0);
    expect(b.label).toBe('Scratch');
    expect(b.avgScore18).toBe(72);
  });

  it('returns 10 HI benchmark for handicap 10', () => {
    const b = getBenchmark(10);
    expect(b.label).toBe('10 HI');
  });

  it('returns closest for very low handicaps', () => {
    const b = getBenchmark(-5);
    expect(b.label).toBe('Scratch');
  });

  it('returns highest for very high handicaps', () => {
    const b = getBenchmark(40);
    expect(b.label).toBe('30+ HI');
  });
});

describe('analyzeRound', () => {
  const makeRound = (overrides?: Partial<Round>): Round => ({
    id: 'test-round',
    user_id: 'user1',
    round_date: '2026-03-01',
    course_name: 'Test Course',
    tees: 'Blue',
    holes_played: 18,
    total_score: 90,
    total_putts: 36,
    total_fairways_hit: 7,
    total_fairways: 14,
    total_gir: 6,
    total_penalties: 1,
    notes: null,
    created_at: '2026-03-01',
    ...overrides,
  });

  const makeHoles = (count: number = 18): RoundHole[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `hole-${i + 1}`,
      round_id: 'test-round',
      hole_number: i + 1,
      par: i % 4 === 0 ? 3 : i % 4 === 3 ? 5 : 4,
      score: 5,
      putts: 2,
      fairway_hit: i % 4 !== 0 ? i % 2 === 0 : null, // FIR on par 4/5
      gir: i % 3 === 0, // GIR every 3rd hole
      up_and_down: i % 3 !== 0 ? i % 4 === 1 : null, // Up & down on some non-GIR
      sand_save: null,
      penalty_strokes: i === 5 ? 1 : 0,
      club_off_tee: null,
      approach_distance_yd: null,
      notes: null,
      created_at: '2026-03-01',
    }));

  it('returns analysis for a valid round', () => {
    const round = makeRound();
    const holes = makeHoles();
    const analysis = analyzeRound(round, holes, 15);

    expect(analysis).toBeDefined();
    expect(analysis.benchmark.label).toBe('15 HI');
    expect(analysis.holes).toHaveLength(18);
    expect(analysis.totalPutts).toBe(36);
  });

  it('computes SG categories', () => {
    const round = makeRound();
    const holes = makeHoles();
    const analysis = analyzeRound(round, holes, 15);

    // All SG values should be numbers
    expect(typeof analysis.sgOtt).toBe('number');
    expect(typeof analysis.sgApproach).toBe('number');
    expect(typeof analysis.sgShortGame).toBe('number');
    expect(typeof analysis.sgPutting).toBe('number');
    expect(typeof analysis.totalSG).toBe('number');
  });

  it('counts stats correctly', () => {
    const round = makeRound();
    const holes = makeHoles();
    const analysis = analyzeRound(round, holes, 10);

    expect(analysis.totalPutts).toBe(36);
    expect(analysis.totalPenalties).toBe(1);
    expect(analysis.girCount).toBe(6); // every 3rd hole
    expect(analysis.threePuttCount).toBe(0); // all 2 putts
    expect(analysis.onePuttCount).toBe(0);
  });

  it('handles empty holes gracefully', () => {
    const round = makeRound();
    const analysis = analyzeRound(round, [], 15);

    expect(analysis.holes).toHaveLength(0);
    expect(analysis.totalPutts).toBe(0);
  });

  it('scales 9-hole rounds to 18', () => {
    const round = makeRound({ holes_played: 9 });
    const holes = makeHoles(9);
    const analysis = analyzeRound(round, holes, 15);

    // SG should be scaled up to 18-hole equivalent
    expect(analysis.projectedScore).toBe(90); // 15 HI benchmark
  });

  it('detects three-putts', () => {
    const round = makeRound();
    const holes = makeHoles();
    // Make some three-putts
    holes[0].putts = 3;
    holes[5].putts = 3;
    holes[10].putts = 3;
    const analysis = analyzeRound(round, holes, 15);

    expect(analysis.threePuttCount).toBe(3);
  });

  it('detects one-putts', () => {
    const round = makeRound();
    const holes = makeHoles();
    holes[0].putts = 1;
    holes[3].putts = 1;
    const analysis = analyzeRound(round, holes, 15);

    expect(analysis.onePuttCount).toBe(2);
  });
});
