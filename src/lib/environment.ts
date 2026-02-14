import type { EnvironmentConditions, Shot } from './types';

// ============================================================
// Standard (sea level) conditions
// ============================================================
export const STANDARD_CONDITIONS: EnvironmentConditions = {
  elevationFt: 0,
  temperatureF: 59,
  relativeHumidityPct: 50,
  pressureInHg: 29.92,
};

// ============================================================
// Air density model constants
// ============================================================
const R_DRY = 287.058; // J/(kg·K) - specific gas constant for dry air
const R_VAPOR = 461.495; // J/(kg·K) - specific gas constant for water vapor
const INHG_TO_PA = 3386.39; // 1 inHg in Pascals
const LAPSE_RATE = 0.00356616; // °F per foot (standard atmosphere)
const STD_TEMP_F = 59; // Standard temp at sea level (°F)
const STD_PRESSURE_INHG = 29.92;

/**
 * Default exponent for the carry adjustment model:
 *   carryAdjusted = carryObserved * (ρ_standard / ρ_env)^k
 *
 * k ≈ 0.5–0.7. Higher values mean more sensitivity to air density.
 * This is a simplified model. Real ball flight depends on spin, speed, etc.
 */
export const DEFAULT_K = 0.6;

// ============================================================
// Temperature conversions
// ============================================================
function fToC(f: number): number {
  return (f - 32) * (5 / 9);
}

function fToK(f: number): number {
  return fToC(f) + 273.15;
}

// ============================================================
// Estimate barometric pressure from elevation if not provided
// Uses a simplified barometric formula
// ============================================================
export function estimatePressureInHg(elevationFt: number): number {
  // Standard barometric formula approximation
  return STD_PRESSURE_INHG * Math.pow(1 - 6.8753e-6 * elevationFt * 0.3048, 5.2559);
}

// ============================================================
// Saturation vapor pressure (Buck equation)
// ============================================================
function saturationVaporPressurePa(tempC: number): number {
  // Buck equation (1981)
  return 611.21 * Math.exp((18.678 - tempC / 234.5) * (tempC / (257.14 + tempC)));
}

// ============================================================
// Compute air density (kg/m³)
// ============================================================
export function computeAirDensity(conditions: EnvironmentConditions): number {
  const pressureInHg = conditions.pressureInHg ?? estimatePressureInHg(conditions.elevationFt);
  const pressurePa = pressureInHg * INHG_TO_PA;
  const tempK = fToK(conditions.temperatureF);
  const tempC = fToC(conditions.temperatureF);

  const pSat = saturationVaporPressurePa(tempC);
  const pVapor = (conditions.relativeHumidityPct / 100) * pSat;
  const pDry = pressurePa - pVapor;

  // ρ = pDry / (R_dry * T) + pVapor / (R_vapor * T)
  const rho = pDry / (R_DRY * tempK) + pVapor / (R_VAPOR * tempK);
  return rho;
}

// ============================================================
// Density altitude approximation (feet)
// ============================================================
export function computeDensityAltitude(conditions: EnvironmentConditions): number {
  const pressureInHg = conditions.pressureInHg ?? estimatePressureInHg(conditions.elevationFt);
  // Pressure altitude
  const pressureAltitude = (1 - Math.pow(pressureInHg / STD_PRESSURE_INHG, 1 / 5.2559)) / 6.8753e-6 / 0.3048;
  // Density altitude = pressure altitude + 120 * (OAT - ISA temp at pressure altitude)
  const isaTemp = STD_TEMP_F - LAPSE_RATE * pressureAltitude;
  const densityAltitude = pressureAltitude + 120 * (conditions.temperatureF - isaTemp);
  return densityAltitude;
}

// ============================================================
// Adjust carry distance for environment
// ============================================================
export function adjustCarry(
  carryObserved: number,
  envObserved: EnvironmentConditions,
  envTarget: EnvironmentConditions,
  k: number = DEFAULT_K
): number {
  const rhoObserved = computeAirDensity(envObserved);
  const rhoTarget = computeAirDensity(envTarget);

  if (rhoTarget <= 0 || rhoObserved <= 0) return carryObserved;

  // Lower air density = ball goes farther
  // carryNew = carryObs * (ρ_obs / ρ_target)^k
  return carryObserved * Math.pow(rhoObserved / rhoTarget, k);
}

// ============================================================
// Normalize shots to standard conditions
// ============================================================
export function normalizeShot(
  shot: Shot,
  sessionEnv: EnvironmentConditions,
  k: number = DEFAULT_K
): Shot {
  const carryAdj = adjustCarry(shot.carry_distance_yd, sessionEnv, STANDARD_CONDITIONS, k);
  const totalAdj = adjustCarry(shot.total_distance_yd, sessionEnv, STANDARD_CONDITIONS, k);

  return {
    ...shot,
    carry_distance_yd: carryAdj,
    total_distance_yd: totalAdj,
  };
}

// ============================================================
// Simulate shots at a destination environment
// ============================================================
export function simulateShot(
  shot: Shot,
  sessionEnv: EnvironmentConditions,
  destEnv: EnvironmentConditions,
  k: number = DEFAULT_K
): Shot {
  // First normalize to standard, then adjust to destination
  const carryStd = adjustCarry(shot.carry_distance_yd, sessionEnv, STANDARD_CONDITIONS, k);
  const carryDest = adjustCarry(carryStd, STANDARD_CONDITIONS, destEnv, k);
  const totalStd = adjustCarry(shot.total_distance_yd, sessionEnv, STANDARD_CONDITIONS, k);
  const totalDest = adjustCarry(totalStd, STANDARD_CONDITIONS, destEnv, k);

  return {
    ...shot,
    carry_distance_yd: carryDest,
    total_distance_yd: totalDest,
  };
}

// ============================================================
// Normalize an array of shots
// ============================================================
export function normalizeShots(
  shots: Shot[],
  sessionEnv: EnvironmentConditions,
  k: number = DEFAULT_K
): Shot[] {
  return shots.map((s) => normalizeShot(s, sessionEnv, k));
}

export function simulateShots(
  shots: Shot[],
  sessionEnv: EnvironmentConditions,
  destEnv: EnvironmentConditions,
  k: number = DEFAULT_K
): Shot[] {
  return shots.map((s) => simulateShot(s, sessionEnv, destEnv, k));
}

// ============================================================
// "Plays like" yardage calculator for on-course use
// ============================================================
export interface PlaysLikeInput {
  yardage: number;
  elevationChangeFt: number; // positive = uphill, negative = downhill
  windMph: number; // positive = headwind, negative = tailwind
  temperatureF: number;
  relativeHumidityPct: number;
  elevationFt: number;
}

export function computePlaysLike(input: PlaysLikeInput): {
  playsLikeYardage: number;
  elevationEffect: number;
  windEffect: number;
  altitudeEffect: number;
  tempEffect: number;
} {
  // Elevation change: ~1 yard per 3 ft of elevation change
  const elevationEffect = input.elevationChangeFt / 3;

  // Wind: ~1% per mph (simplified)
  const windEffect = input.yardage * (input.windMph * 0.01);

  // Altitude: compute air density ratio vs standard
  const env: EnvironmentConditions = {
    elevationFt: input.elevationFt,
    temperatureF: input.temperatureF,
    relativeHumidityPct: input.relativeHumidityPct,
  };
  const rhoEnv = computeAirDensity(env);
  const rhoStd = computeAirDensity(STANDARD_CONDITIONS);
  const altitudeEffect = input.yardage * (1 - Math.pow(rhoEnv / rhoStd, DEFAULT_K)) * -1;

  // Temperature beyond 59°F: ~0.2% per degree
  const tempEffect = input.yardage * ((input.temperatureF - 59) * 0.002);

  const playsLikeYardage =
    input.yardage + elevationEffect + windEffect - altitudeEffect - tempEffect;

  return {
    playsLikeYardage: Math.round(playsLikeYardage * 10) / 10,
    elevationEffect: Math.round(elevationEffect * 10) / 10,
    windEffect: Math.round(windEffect * 10) / 10,
    altitudeEffect: Math.round(altitudeEffect * 10) / 10,
    tempEffect: Math.round(tempEffect * 10) / 10,
  };
}
