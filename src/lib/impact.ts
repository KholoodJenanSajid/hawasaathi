import { CommuteMode } from '../types/profile';
import { RoomHelperResult } from '../types/planner';

export const IMPACT_MATH_VERSION = 'hawasaathi-planning-2026.1';

/**
 * Published-order transport emission factors (kg CO2e per passenger-kilometer).
 * Sources: Central Pollution Control Board & Bureau of Energy Efficiency Indian urban transport proxies.
 * Note: Walking, cycling, and working from home are designated near-zero tailpipe emissions without
 * inventing false sub-gram precision.
 */
export const TRANSPORT_EMISSION_FACTORS: Record<
  CommuteMode,
  { factorKgPerKm: number; label: string; isZeroTailpipe: boolean; assumption: string }
> = {
  car: {
    factorKgPerKm: 0.170,
    label: 'Solo Petrol/Diesel Car',
    isZeroTailpipe: false,
    assumption: 'Average Indian urban passenger car (petrol/diesel, single occupant, city driving cycles)',
  },
  carpool: {
    factorKgPerKm: 0.057, // Will be dynamically adjusted by occupancy (0.170 / occupancy)
    label: 'Carpool (Shared Car)',
    isZeroTailpipe: false,
    assumption: 'Shared passenger car emission allocated equally across vehicle occupants',
  },
  two_wheeler: {
    factorKgPerKm: 0.045,
    label: 'Two-Wheeler (Motorcycle/Scooter)',
    isZeroTailpipe: false,
    assumption: 'Standard 100-150cc 4-stroke commuter two-wheeler in mixed city traffic',
  },
  metro_bus: {
    factorKgPerKm: 0.028, // Weighted urban public transit proxy (metro ~0.022, bus ~0.035)
    label: 'Metro or City Bus',
    isZeroTailpipe: false,
    assumption: 'Indian urban public mass transit (high-efficiency electric metro and public bus networks)',
  },
  cycle: {
    factorKgPerKm: 0.0,
    label: 'Bicycle',
    isZeroTailpipe: true,
    assumption: 'Zero tailpipe emissions; active human-powered transit',
  },
  walk: {
    factorKgPerKm: 0.0,
    label: 'Walking',
    isZeroTailpipe: true,
    assumption: 'Zero tailpipe emissions; active pedestrian transit',
  },
  work_from_home: {
    factorKgPerKm: 0.0,
    label: 'Work From Home',
    isZeroTailpipe: true,
    assumption: 'Zero commute travel distance and zero commute vehicular exhaust',
  },
};

export interface TransportImpactCalculation {
  version: string;
  oneWayKm: number;
  commuteDaysPerWeek: number;
  annualKm: number;
  currentMode: CommuteMode;
  currentFactor: number;
  carpoolOccupancy?: number;
  annualKgCo2e: number;
  monthlyKgCo2e: number;
  weeklyKgCo2e: number;
  annualRangeKgCo2e: [number, number]; // ±20% planning range
  soloCarBaselineAnnualKg: number;
  savedVsCarAnnualKg: number;
  savedVsCarWeeklyKg: number;
  isZeroTailpipe: boolean;
  factorVersion: string;
  assumption: string;
}

/**
 * Deterministic transport emission math:
 * annualKm = oneWayKm × 2 × daysPerWeek × 52
 * annual emissions = annualKm × factor
 * Carpool divides car factor by occupancy.
 * Uncertainty: ±20% planning range.
 */
export function calculateTransportEmissions(
  mode: CommuteMode,
  oneWayKm: number,
  commuteDaysPerWeek: number,
  carpoolOccupancy: number = 3
): TransportImpactCalculation {
  const safeKm = Math.max(0, oneWayKm);
  const safeDays = Math.max(0, Math.min(7, commuteDaysPerWeek));
  const safeOccupancy = Math.max(2, carpoolOccupancy);
  const annualKm = safeKm * 2 * safeDays * 52;

  const soloCarFactor = TRANSPORT_EMISSION_FACTORS.car.factorKgPerKm;
  const soloCarBaselineAnnualKg = Number((annualKm * soloCarFactor).toFixed(1));

  let factor = TRANSPORT_EMISSION_FACTORS[mode].factorKgPerKm;
  let assumption = TRANSPORT_EMISSION_FACTORS[mode].assumption;

  if (mode === 'carpool') {
    factor = soloCarFactor / safeOccupancy;
    assumption = `Shared petrol/diesel car with ${safeOccupancy} occupants (${(factor * 1000).toFixed(0)} g CO2e/p-km)`;
  }

  const isZeroTailpipe = TRANSPORT_EMISSION_FACTORS[mode].isZeroTailpipe;
  const annualKg = isZeroTailpipe ? 0 : Number((annualKm * factor).toFixed(1));
  const monthlyKg = isZeroTailpipe ? 0 : Number((annualKg / 12).toFixed(1));
  const weeklyKg = isZeroTailpipe ? 0 : Number((annualKg / 52).toFixed(2));

  // ±20% planning range
  const rangeLow = isZeroTailpipe ? 0 : Number((annualKg * 0.8).toFixed(1));
  const rangeHigh = isZeroTailpipe ? 0 : Number((annualKg * 1.2).toFixed(1));

  const savedAnnual = Math.max(0, Number((soloCarBaselineAnnualKg - annualKg).toFixed(1)));
  const savedWeekly = Math.max(0, Number((savedAnnual / 52).toFixed(2)));

  return {
    version: IMPACT_MATH_VERSION,
    oneWayKm: safeKm,
    commuteDaysPerWeek: safeDays,
    annualKm,
    currentMode: mode,
    currentFactor: factor,
    carpoolOccupancy: mode === 'carpool' ? safeOccupancy : undefined,
    annualKgCo2e: annualKg,
    monthlyKgCo2e: monthlyKg,
    weeklyKgCo2e: weeklyKg,
    annualRangeKgCo2e: [rangeLow, rangeHigh],
    soloCarBaselineAnnualKg,
    savedVsCarAnnualKg: savedAnnual,
    savedVsCarWeeklyKg: savedWeekly,
    isZeroTailpipe,
    factorVersion: IMPACT_MATH_VERSION,
    assumption,
  };
}

export interface ExposureProxyCalculation {
  version: string;
  pm25Concentration: number;
  hoursOutside: number;
  proxyValue: number; // PM2.5 × hours
  unit: string; // µg·h/m³
  label: string;
  safetyNotice: string;
}

/**
 * Pure function to calculate outdoor exposure proxy:
 * PM2.5 (µg/m³) × hours outside = µg·h/m³
 *
 * SAFETY MANDATE: Labeled explicitly as a "concentration-time proxy,
 * not an inhaled dose and not a health risk score."
 */
export function calculateExposureProxy(
  pm25Concentration: number | null | undefined,
  hoursOutside: number
): ExposureProxyCalculation {
  const safePm25 = Math.max(0, pm25Concentration ?? 0);
  const safeHours = Math.max(0, hoursOutside);
  const proxy = Number((safePm25 * safeHours).toFixed(1));

  return {
    version: IMPACT_MATH_VERSION,
    pm25Concentration: safePm25,
    hoursOutside: safeHours,
    proxyValue: proxy,
    unit: 'µg·h/m³',
    label: `${proxy} µg·h/m³ concentration-time proxy`,
    safetyNotice:
      'Concentration-time proxy only, not an inhaled dose and not a health risk score.',
  };
}

/**
 * Room purifier sizing helper:
 * Room volume V = length × width × height (in m³)
 * Target ACH = 6 if vulnerability flag is set, else 5.
 * CADR hint = V × ACH (m³/h)
 *
 * SAFETY MANDATE: Labeled explicitly as a "sizing hint, not a predicted indoor concentration."
 */
export function calculateRoomCadrHint(
  lengthM: number,
  widthM: number,
  heightM: number,
  hasVulnerability: boolean = false
): RoomHelperResult {
  const safeL = Math.max(1, lengthM);
  const safeW = Math.max(1, widthM);
  const safeH = Math.max(1.5, heightM);
  const volumeM3 = Number((safeL * safeW * safeH).toFixed(1));

  const targetAch = hasVulnerability ? 6 : 5;
  const cadrM3h = Math.round(volumeM3 * targetAch);
  const cadrCfm = Math.round(cadrM3h / 1.7); // 1 CFM ≈ 1.7 m³/h

  return {
    lengthM: safeL,
    widthM: safeW,
    heightM: safeH,
    volumeM3,
    targetAch,
    cadrM3h,
    cadrCfm,
    sizingHintNote: `Estimated sizing hint: ~${cadrM3h} m³/h (~${cadrCfm} CFM) for ${targetAch} air changes per hour (ACH).`,
    disclaimer:
      'This calculation is an approximate room sizing hint only, not a predicted indoor concentration.',
  };
}
