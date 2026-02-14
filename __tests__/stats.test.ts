import { computeClubStats, computeEllipse, filterShots, getClubSpecificSessions, isOutlier, trimmedMean, percentile } from '../src/lib/stats';
import type { Shot, ShotFilter } from '../src/lib/types';

function makeShot(overrides: Partial<Shot> = {}): Shot {
  return {
    id: Math.random().toString(36),
    session_id: 'sess1',
    datetime: '2024-01-01T10:00:00Z',
    club_name: '7 Iron',
    club_type: 'Iron',
    carry_distance_yd: 150,
    carry_lateral_yd: 0,
    total_distance_yd: 165,
    total_lateral_yd: 0,
    is_full_shot: true,
    target_distance_yd: null,
    tags: [],
    notes: null,
    raw: null,
    ...overrides,
  };
}

describe('filterShots', () => {
  const shots: Shot[] = [
    makeShot({ is_full_shot: true, club_name: 'Driver' }),
    makeShot({ is_full_shot: false, club_name: 'Driver', tags: ['3/4'] }),
    makeShot({ is_full_shot: true, club_name: '7 Iron', target_distance_yd: 150 }),
    makeShot({ is_full_shot: true, club_name: 'PW', target_distance_yd: 120, carry_distance_yd: 125 }),
  ];

  it('filters full shots only (default)', () => {
    const filter: ShotFilter = { fullShotsOnly: true, includePartials: false, onlyWithTargets: false, targetWindow: null };
    expect(filterShots(shots, filter)).toHaveLength(3);
  });

  it('includes partials', () => {
    const filter: ShotFilter = { fullShotsOnly: false, includePartials: true, onlyWithTargets: false, targetWindow: null };
    expect(filterShots(shots, filter)).toHaveLength(4);
  });

  it('filters by targets only', () => {
    const filter: ShotFilter = { fullShotsOnly: false, includePartials: true, onlyWithTargets: true, targetWindow: null };
    expect(filterShots(shots, filter)).toHaveLength(2);
  });

  it('applies target window', () => {
    const filter: ShotFilter = { fullShotsOnly: false, includePartials: true, onlyWithTargets: true, targetWindow: 3 };
    // PW: carry=125, target=120, diff=5 > 3 → excluded
    // 7 Iron: carry=150, target=150, diff=0 ≤ 3 → included
    expect(filterShots(shots, filter)).toHaveLength(1);
  });

  it('filters by club name', () => {
    const filter: ShotFilter = { fullShotsOnly: false, includePartials: true, onlyWithTargets: false, targetWindow: null, clubNames: ['Driver'] };
    expect(filterShots(shots, filter)).toHaveLength(2);
  });
});

describe('computeClubStats', () => {
  it('computes basic stats for a single club', () => {
    const shots = [
      makeShot({ carry_distance_yd: 148, carry_lateral_yd: 2, total_distance_yd: 162, total_lateral_yd: 3 }),
      makeShot({ carry_distance_yd: 152, carry_lateral_yd: -1, total_distance_yd: 166, total_lateral_yd: -2 }),
      makeShot({ carry_distance_yd: 150, carry_lateral_yd: 0, total_distance_yd: 164, total_lateral_yd: 0 }),
      makeShot({ carry_distance_yd: 149, carry_lateral_yd: 3, total_distance_yd: 163, total_lateral_yd: 4 }),
      makeShot({ carry_distance_yd: 151, carry_lateral_yd: -2, total_distance_yd: 165, total_lateral_yd: -3 }),
    ];

    const stats = computeClubStats(shots);
    expect(stats).toHaveLength(1);

    const club = stats[0];
    expect(club.clubName).toBe('7 Iron');
    expect(club.n).toBe(5);
    expect(club.carry.meanDistance).toBeCloseTo(150);
    expect(club.carry.meanLateral).toBeCloseTo(0.4);
    expect(club.carry.sdDistance).toBeGreaterThan(0);
    expect(club.carry.sdLateral).toBeGreaterThan(0);
    expect(club.carry.medianDistance).toBeCloseTo(150);
    expect(club.carry.ellipse1Sigma).toBeDefined();
    expect(club.carry.ellipse2Sigma).toBeDefined();
    expect(club.carry.patternArea1Sigma).toBeGreaterThan(0);
  });

  it('computes stats for multiple clubs', () => {
    const shots = [
      makeShot({ club_name: 'Driver', carry_distance_yd: 240 }),
      makeShot({ club_name: 'Driver', carry_distance_yd: 245 }),
      makeShot({ club_name: '7 Iron', carry_distance_yd: 150 }),
      makeShot({ club_name: '7 Iron', carry_distance_yd: 155 }),
    ];

    const stats = computeClubStats(shots);
    expect(stats).toHaveLength(2);
  });

  it('computes target stats when target exists', () => {
    const shots = [
      makeShot({ carry_distance_yd: 148, target_distance_yd: 150 }),
      makeShot({ carry_distance_yd: 152, target_distance_yd: 150 }),
      makeShot({ carry_distance_yd: 145, target_distance_yd: 150 }),
      makeShot({ carry_distance_yd: 160, target_distance_yd: 150 }),
    ];

    const stats = computeClubStats(shots);
    expect(stats[0].targetStats).toBeDefined();
    expect(stats[0].targetStats!.meanError).toBeCloseTo(1.25); // (−2+2−5+10)/4 = 1.25
    // 148: |148-150|=2 ≤5, 152: |152-150|=2 ≤5, 145: |145-150|=5 ≤5, 160: |160-150|=10 >5
    expect(stats[0].targetStats!.pctWithin5).toBeCloseTo(0.75); // 3 out of 4 within ≤5
    expect(stats[0].targetStats!.pctWithin10).toBeCloseTo(1.0); // all 4 within ≤10
  });
});

describe('computeEllipse', () => {
  it('computes 1σ ellipse from covariance matrix', () => {
    // Simple case: no correlation
    const ellipse = computeEllipse(4, 0, 9, 0, 0, 1);
    expect(ellipse.cx).toBe(0);
    expect(ellipse.cy).toBe(0);
    expect(ellipse.rx).toBeCloseTo(3); // sqrt(9)
    expect(ellipse.ry).toBeCloseTo(2); // sqrt(4)
  });

  it('computes 2σ ellipse', () => {
    const ellipse = computeEllipse(4, 0, 9, 0, 0, 2);
    expect(ellipse.rx).toBeCloseTo(6); // 2 * sqrt(9)
    expect(ellipse.ry).toBeCloseTo(4); // 2 * sqrt(4)
  });

  it('handles correlated data', () => {
    const ellipse = computeEllipse(4, 2, 9, 0, 0, 1);
    // With correlation, ellipse should be rotated
    expect(ellipse.rotation).not.toBe(0);
    expect(ellipse.rx).toBeGreaterThan(0);
    expect(ellipse.ry).toBeGreaterThan(0);
  });
});

describe('isOutlier', () => {
  it('returns false for points inside 2σ ellipse', () => {
    const ellipse = computeEllipse(100, 0, 100, 0, 150, 2);
    expect(isOutlier(0, 150, ellipse)).toBe(false);
    expect(isOutlier(5, 155, ellipse)).toBe(false);
  });

  it('returns true for points far outside ellipse', () => {
    const ellipse = computeEllipse(100, 0, 100, 0, 150, 2);
    expect(isOutlier(50, 200, ellipse)).toBe(true);
  });
});

describe('getClubSpecificSessions', () => {
  it('only includes sessions that have the specified club', () => {
    const shots = [
      makeShot({ session_id: 's1', club_name: 'Driver' }),
      makeShot({ session_id: 's2', club_name: '7 Iron' }),
      makeShot({ session_id: 's3', club_name: 'Driver' }),
      makeShot({ session_id: 's3', club_name: '7 Iron' }),
    ];

    const sessions = [
      { id: 's1', played_at: '2024-01-01' },
      { id: 's2', played_at: '2024-01-02' },
      { id: 's3', played_at: '2024-01-03' },
    ];

    const result = getClubSpecificSessions(shots, 'Driver', sessions, 5);
    expect(result.sessionIds).toContain('s1');
    expect(result.sessionIds).toContain('s3');
    expect(result.sessionIds).not.toContain('s2');
    expect(result.totalSessions).toBe(2);
  });

  it('respects N limit', () => {
    const shots = [
      makeShot({ session_id: 's1', club_name: 'Driver' }),
      makeShot({ session_id: 's2', club_name: 'Driver' }),
      makeShot({ session_id: 's3', club_name: 'Driver' }),
    ];

    const sessions = [
      { id: 's1', played_at: '2024-01-01' },
      { id: 's2', played_at: '2024-01-02' },
      { id: 's3', played_at: '2024-01-03' },
    ];

    const result = getClubSpecificSessions(shots, 'Driver', sessions, 2);
    expect(result.totalSessions).toBe(2);
    // Should pick the most recent
    expect(result.sessionIds).toContain('s3');
    expect(result.sessionIds).toContain('s2');
  });
});

describe('trimmedMean', () => {
  it('computes trimmed mean removing top/bottom 10%', () => {
    const values = [100, 110, 120, 130, 140, 150, 160, 170, 180, 190];
    // Remove bottom 1 (100) and top 1 (190), mean of 110–180
    const result = trimmedMean(values, 0.1);
    expect(result).toBeCloseTo(145);
  });

  it('handles empty array', () => {
    expect(trimmedMean([])).toBe(0);
  });
});

describe('percentile', () => {
  it('computes P50 (median)', () => {
    const sorted = [1, 2, 3, 4, 5];
    expect(percentile(sorted, 50)).toBeCloseTo(3);
  });

  it('computes P10 and P90', () => {
    const sorted = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(sorted, 10)).toBeCloseTo(10.9);
    expect(percentile(sorted, 90)).toBeCloseTo(90.1);
  });

  it('handles single element', () => {
    expect(percentile([42], 50)).toBe(42);
  });
});
