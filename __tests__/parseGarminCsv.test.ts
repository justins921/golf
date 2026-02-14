import { parseGarminCsv, assignIds } from '../src/lib/parseGarminCsv';

const SAMPLE_CSV = `Date,Time,Player,Club Name,Club Type,Club Speed,Ball Speed,Smash Factor,Launch Angle,Launch Direction,Back Spin,Side Spin,Spin Axis,Spin Rate,Carry Distance,Carry Deviation Distance,Carry Deviation Angle,Total Distance,Total Deviation Distance,Total Deviation Angle,Hang Time,Max Height,Descent Angle
,[mph],[],[],[],[mph],[mph],[],[deg],[deg],[rpm],[rpm],[deg],[rpm],[yd],[yd],[deg],[yd],[yd],[deg],[s],[yd],[deg]
2024-03-15,10:00:00,John,7 Iron,Iron,85.2,115.3,1.35,18.5,1.2,5200,200,2.2,5204,152.3,3.5,1.3,165.2,4.1,1.5,5.8,28.5,42.3
2024-03-15,10:01:00,John,7 Iron,Iron,84.8,114.1,1.35,19.1,-0.8,5100,-150,-1.7,5102,148.7,-2.1,-0.8,161.5,-2.8,-1.0,5.6,27.8,41.8
2024-03-15,10:02:00,John,Driver,Wood,105.2,152.3,1.45,12.5,2.1,2800,350,7.1,2822,245.8,12.5,2.9,268.3,15.2,3.2,6.2,32.1,38.5
2024-03-15,10:03:00,John,Driver,Wood,104.1,150.8,1.45,11.8,-1.5,2900,-200,-3.9,2907,240.2,-8.3,-2.0,262.1,-10.1,-2.2,6.0,31.2,37.8
`;

const MINIMAL_CSV = `Date,Club Name,Club Type,Carry Distance,Carry Deviation Distance,Total Distance,Total Deviation Distance
2024-01-01,PW,Wedge,115.5,2.3,125.2,3.1
2024-01-01,PW,Wedge,118.2,-1.5,128.8,-2.0
`;

const CSV_WITH_BLANKS = `Date,Club Name,Club Type,Carry Distance,Carry Deviation Distance,Total Distance,Total Deviation Distance
2024-01-01,9 Iron,Iron,135.5,,145.2,
2024-01-01,9 Iron,Iron,138.2,-1.5,148.8,-2.0
`;

describe('parseGarminCsv', () => {
  it('parses a standard Garmin R50 CSV with units row', () => {
    const result = parseGarminCsv(SAMPLE_CSV);

    expect(result.errors).toHaveLength(0);
    expect(result.shots).toHaveLength(4);
    expect(result.clubs).toContain('7 Iron');
    expect(result.clubs).toContain('Driver');
    expect(result.playerName).toBe('John');
    expect(result.dateRange.earliest).toBeTruthy();
    expect(result.dateRange.latest).toBeTruthy();
  });

  it('correctly parses carry and total distances', () => {
    const result = parseGarminCsv(SAMPLE_CSV);
    const firstShot = result.shots[0];

    expect(firstShot.carry_distance_yd).toBeCloseTo(152.3);
    expect(firstShot.carry_lateral_yd).toBeCloseTo(3.5);
    expect(firstShot.total_distance_yd).toBeCloseTo(165.2);
    expect(firstShot.total_lateral_yd).toBeCloseTo(4.1);
  });

  it('preserves lateral sign (negative = left)', () => {
    const result = parseGarminCsv(SAMPLE_CSV);
    const secondShot = result.shots[1];

    expect(secondShot.carry_lateral_yd).toBeCloseTo(-2.1);
    expect(secondShot.total_lateral_yd).toBeCloseTo(-2.8);
  });

  it('sets default values for missing fields', () => {
    const result = parseGarminCsv(SAMPLE_CSV);
    const shot = result.shots[0];

    expect(shot.is_full_shot).toBe(true);
    expect(shot.target_distance_yd).toBeNull();
    expect(shot.tags).toEqual([]);
    expect(shot.notes).toBeNull();
  });

  it('parses minimal CSV without units row', () => {
    const result = parseGarminCsv(MINIMAL_CSV);

    expect(result.shots).toHaveLength(2);
    expect(result.shots[0].club_name).toBe('PW');
    expect(result.shots[0].club_type).toBe('Wedge');
    expect(result.shots[0].carry_distance_yd).toBeCloseTo(115.5);
  });

  it('handles empty lateral deviation as 0', () => {
    const result = parseGarminCsv(CSV_WITH_BLANKS);

    expect(result.shots).toHaveLength(2);
    expect(result.shots[0].carry_lateral_yd).toBe(0);
    expect(result.shots[0].total_lateral_yd).toBe(0);
  });

  it('skips rows without a date', () => {
    const csvWithEmptyRow = `Date,Club Name,Club Type,Carry Distance,Carry Deviation Distance,Total Distance,Total Deviation Distance
2024-01-01,PW,Wedge,115.5,2.3,125.2,3.1
,PW,Wedge,115.5,2.3,125.2,3.1
2024-01-02,PW,Wedge,118.2,-1.5,128.8,-2.0
`;
    const result = parseGarminCsv(csvWithEmptyRow);
    expect(result.shots).toHaveLength(2);
  });

  it('reports errors for missing distance data', () => {
    const csvMissing = `Date,Club Name,Club Type,Carry Distance,Carry Deviation Distance,Total Distance,Total Deviation Distance
2024-01-01,PW,Wedge,,2.3,,3.1
`;
    const result = parseGarminCsv(csvMissing);
    expect(result.shots).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('handles empty input', () => {
    const result = parseGarminCsv('');
    expect(result.shots).toHaveLength(0);
  });

  it('stores raw data in each shot', () => {
    const result = parseGarminCsv(SAMPLE_CSV);
    expect(result.shots[0].raw).toBeDefined();
    expect(Object.keys(result.shots[0].raw!).length).toBeGreaterThan(0);
  });
});

describe('assignIds', () => {
  it('assigns unique ids and session_id', () => {
    const result = parseGarminCsv(SAMPLE_CSV);
    const shots = assignIds(result.shots, 'test-session-id');

    expect(shots).toHaveLength(4);
    shots.forEach((s) => {
      expect(s.id).toBeTruthy();
      expect(s.session_id).toBe('test-session-id');
    });

    // All IDs should be unique
    const ids = new Set(shots.map((s) => s.id));
    expect(ids.size).toBe(4);
  });
});
