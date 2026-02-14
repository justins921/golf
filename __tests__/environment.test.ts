import {
  computeAirDensity,
  computeDensityAltitude,
  estimatePressureInHg,
  adjustCarry,
  normalizeShot,
  simulateShot,
  computePlaysLike,
  STANDARD_CONDITIONS,
  DEFAULT_K,
} from '../src/lib/environment';
import type { EnvironmentConditions, Shot } from '../src/lib/types';

function makeShot(overrides: Partial<Shot> = {}): Shot {
  return {
    id: 'test',
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

describe('computeAirDensity', () => {
  it('computes standard air density at sea level', () => {
    const rho = computeAirDensity(STANDARD_CONDITIONS);
    // Standard air density is approximately 1.225 kg/m³
    expect(rho).toBeCloseTo(1.225, 1);
  });

  it('lower density at higher elevation', () => {
    const seaLevel = computeAirDensity(STANDARD_CONDITIONS);
    const highAlt: EnvironmentConditions = {
      elevationFt: 5000,
      temperatureF: 59,
      relativeHumidityPct: 50,
    };
    const rhoHigh = computeAirDensity(highAlt);
    expect(rhoHigh).toBeLessThan(seaLevel);
  });

  it('lower density at higher temperature', () => {
    const cool = computeAirDensity({ elevationFt: 0, temperatureF: 40, relativeHumidityPct: 50 });
    const hot = computeAirDensity({ elevationFt: 0, temperatureF: 100, relativeHumidityPct: 50 });
    expect(hot).toBeLessThan(cool);
  });

  it('humidity has a small effect on density', () => {
    const dry = computeAirDensity({ elevationFt: 0, temperatureF: 80, relativeHumidityPct: 0 });
    const humid = computeAirDensity({ elevationFt: 0, temperatureF: 80, relativeHumidityPct: 100 });
    // Humid air is slightly LESS dense than dry air
    expect(humid).toBeLessThan(dry);
    // But the difference should be small
    expect(Math.abs(humid - dry) / dry).toBeLessThan(0.02);
  });
});

describe('estimatePressureInHg', () => {
  it('returns ~29.92 at sea level', () => {
    expect(estimatePressureInHg(0)).toBeCloseTo(29.92, 1);
  });

  it('decreases with elevation', () => {
    expect(estimatePressureInHg(5000)).toBeLessThan(29.92);
    expect(estimatePressureInHg(5000)).toBeGreaterThan(24);
  });
});

describe('computeDensityAltitude', () => {
  it('density altitude equals elevation at standard conditions', () => {
    const da = computeDensityAltitude({
      elevationFt: 0,
      temperatureF: 59,
      relativeHumidityPct: 0,
      pressureInHg: 29.92,
    });
    expect(Math.abs(da)).toBeLessThan(200); // Close to 0
  });

  it('hot conditions increase density altitude', () => {
    const da = computeDensityAltitude({
      elevationFt: 0,
      temperatureF: 100,
      relativeHumidityPct: 50,
    });
    expect(da).toBeGreaterThan(0);
  });
});

describe('adjustCarry', () => {
  it('no change when conditions are the same', () => {
    const result = adjustCarry(150, STANDARD_CONDITIONS, STANDARD_CONDITIONS);
    expect(result).toBeCloseTo(150);
  });

  it('ball goes farther at higher altitude (lower density)', () => {
    const highAlt: EnvironmentConditions = {
      elevationFt: 5000,
      temperatureF: 72,
      relativeHumidityPct: 30,
    };
    // Normalizing from high altitude to sea level: ball would be shorter at sea level
    const normalized = adjustCarry(150, highAlt, STANDARD_CONDITIONS);
    expect(normalized).toBeLessThan(150);
  });

  it('ball goes shorter at sea level (higher density)', () => {
    // Simulating from sea level to high altitude: ball would go farther
    const highAlt: EnvironmentConditions = {
      elevationFt: 5000,
      temperatureF: 72,
      relativeHumidityPct: 30,
    };
    const simulated = adjustCarry(150, STANDARD_CONDITIONS, highAlt);
    expect(simulated).toBeGreaterThan(150);
  });
});

describe('normalizeShot', () => {
  it('normalizes shot to standard conditions', () => {
    const shot = makeShot({ carry_distance_yd: 160, total_distance_yd: 175 });
    const env: EnvironmentConditions = {
      elevationFt: 5000,
      temperatureF: 85,
      relativeHumidityPct: 30,
    };

    const normalized = normalizeShot(shot, env);
    // Higher elevation → ball travels farther → normalized should be shorter
    expect(normalized.carry_distance_yd).toBeLessThan(160);
    expect(normalized.total_distance_yd).toBeLessThan(175);
  });
});

describe('simulateShot', () => {
  it('simulates shot at destination conditions', () => {
    const shot = makeShot({ carry_distance_yd: 150, total_distance_yd: 165 });
    const homeEnv: EnvironmentConditions = {
      elevationFt: 500,
      temperatureF: 72,
      relativeHumidityPct: 50,
    };
    const destEnv: EnvironmentConditions = {
      elevationFt: 5000,
      temperatureF: 85,
      relativeHumidityPct: 20,
    };

    const simulated = simulateShot(shot, homeEnv, destEnv);
    // Higher elevation destination → ball should go farther
    expect(simulated.carry_distance_yd).toBeGreaterThan(150);
  });
});

describe('computePlaysLike', () => {
  it('uphill adds yardage', () => {
    const result = computePlaysLike({
      yardage: 150,
      elevationChangeFt: 30,
      windMph: 0,
      temperatureF: 59,
      relativeHumidityPct: 50,
      elevationFt: 0,
    });
    expect(result.playsLikeYardage).toBeGreaterThan(150);
    expect(result.elevationEffect).toBeCloseTo(10);
  });

  it('downhill subtracts yardage', () => {
    const result = computePlaysLike({
      yardage: 150,
      elevationChangeFt: -30,
      windMph: 0,
      temperatureF: 59,
      relativeHumidityPct: 50,
      elevationFt: 0,
    });
    expect(result.playsLikeYardage).toBeLessThan(150);
  });

  it('headwind adds yardage', () => {
    const result = computePlaysLike({
      yardage: 150,
      elevationChangeFt: 0,
      windMph: 10,
      temperatureF: 59,
      relativeHumidityPct: 50,
      elevationFt: 0,
    });
    expect(result.windEffect).toBeGreaterThan(0);
  });

  it('tailwind subtracts yardage', () => {
    const result = computePlaysLike({
      yardage: 150,
      elevationChangeFt: 0,
      windMph: -10,
      temperatureF: 59,
      relativeHumidityPct: 50,
      elevationFt: 0,
    });
    expect(result.windEffect).toBeLessThan(0);
  });
});
