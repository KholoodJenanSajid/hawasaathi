import {
  AqiCategory,
  AqiResult,
  PollutantKey,
  PollutantReading,
} from '../types/air';

export interface BandBreakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

/**
 * Breakpoints for CPCB AQI calculation according to Indian Central Pollution Control Board guidelines.
 * Units:
 * - PM2.5: µg/m³
 * - PM10: µg/m³
 * - NO2: µg/m³
 * - SO2: µg/m³
 * - O3: µg/m³
 * - CO: mg/m³
 *
 * NOTE ON CO CONVERSION: Open-Meteo returns carbon monoxide in µg/m³.
 * We divide Open-Meteo CO values by 1000 to convert to mg/m³ before
 * evaluating against these CPCB breakpoints.
 */
export const CPCB_BREAKPOINTS: Record<PollutantKey, BandBreakpoint[]> = {
  pm2_5: [
    { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
    { cLow: 31, cHigh: 60, iLow: 51, iHigh: 100 },
    { cLow: 61, cHigh: 90, iLow: 101, iHigh: 200 },
    { cLow: 91, cHigh: 120, iLow: 201, iHigh: 300 },
    { cLow: 121, cHigh: 250, iLow: 301, iHigh: 400 },
    { cLow: 251, cHigh: 500, iLow: 401, iHigh: 500 },
  ],
  pm10: [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
    { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
    { cLow: 101, cHigh: 250, iLow: 101, iHigh: 200 },
    { cLow: 251, cHigh: 350, iLow: 201, iHigh: 300 },
    { cLow: 351, cHigh: 430, iLow: 301, iHigh: 400 },
    { cLow: 431, cHigh: 600, iLow: 401, iHigh: 500 },
  ],
  nitrogen_dioxide: [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
    { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
    { cLow: 81, cHigh: 180, iLow: 101, iHigh: 200 },
    { cLow: 181, cHigh: 280, iLow: 201, iHigh: 300 },
    { cLow: 281, cHigh: 400, iLow: 301, iHigh: 400 },
    { cLow: 401, cHigh: 800, iLow: 401, iHigh: 500 },
  ],
  sulphur_dioxide: [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
    { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
    { cLow: 81, cHigh: 380, iLow: 101, iHigh: 200 },
    { cLow: 381, cHigh: 800, iLow: 201, iHigh: 300 },
    { cLow: 801, cHigh: 1600, iLow: 301, iHigh: 400 },
    { cLow: 1601, cHigh: 2000, iLow: 401, iHigh: 500 },
  ],
  ozone: [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
    { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
    { cLow: 101, cHigh: 168, iLow: 101, iHigh: 200 },
    { cLow: 169, cHigh: 208, iLow: 201, iHigh: 300 },
    { cLow: 209, cHigh: 748, iLow: 301, iHigh: 400 },
    { cLow: 749, cHigh: 1000, iLow: 401, iHigh: 500 },
  ],
  carbon_monoxide: [
    { cLow: 0, cHigh: 1.0, iLow: 0, iHigh: 50 },
    { cLow: 1.1, cHigh: 2.0, iLow: 51, iHigh: 100 },
    { cLow: 2.1, cHigh: 10.0, iLow: 101, iHigh: 200 },
    { cLow: 10.1, cHigh: 17.0, iLow: 201, iHigh: 300 },
    { cLow: 17.1, cHigh: 34.0, iLow: 301, iHigh: 400 },
    { cLow: 34.1, cHigh: 50.0, iLow: 401, iHigh: 500 },
  ],
};

export const POLLUTANT_METADATA: Record<
  PollutantKey,
  { name: string; unit: string }
> = {
  pm2_5: { name: 'PM2.5', unit: 'µg/m³' },
  pm10: { name: 'PM10', unit: 'µg/m³' },
  nitrogen_dioxide: { name: 'NO2', unit: 'µg/m³' },
  sulphur_dioxide: { name: 'SO2', unit: 'µg/m³' },
  ozone: { name: 'O3', unit: 'µg/m³' },
  carbon_monoxide: { name: 'CO', unit: 'mg/m³' },
};

/**
 * Calculates a single pollutant's sub-index via linear interpolation within breakpoints.
 * If concentration exceeds the top band, it is capped at 500 and marked as above scale.
 * If concentration is negative or missing/NaN, null is returned.
 */
export function calculateSubIndex(
  key: PollutantKey,
  concentration: number | null | undefined
): { subIndex: number | null; isAboveScale: boolean } {
  if (
    concentration === null ||
    concentration === undefined ||
    isNaN(concentration) ||
    concentration < 0
  ) {
    return { subIndex: null, isAboveScale: false };
  }

  const breakpoints = CPCB_BREAKPOINTS[key];
  if (!breakpoints || breakpoints.length === 0) {
    return { subIndex: null, isAboveScale: false };
  }

  // Check if above highest breakpoint
  const highest = breakpoints[breakpoints.length - 1];
  if (concentration > highest.cHigh) {
    return { subIndex: 500, isAboveScale: true };
  }

  // Find corresponding breakpoint
  for (const bp of breakpoints) {
    if (concentration >= bp.cLow && concentration <= bp.cHigh) {
      // Linear interpolation: I = I_low + ((I_high - I_low) / (C_high - C_low)) * (C - C_low)
      const rangeC = bp.cHigh - bp.cLow;
      const rangeI = bp.iHigh - bp.iLow;
      const sub = bp.iLow + (rangeI / rangeC) * (concentration - bp.cLow);
      return { subIndex: Math.round(sub), isAboveScale: false };
    }
  }

  // In between bands (due to discrete breakpoints e.g. 30 vs 31), interpolate across transition
  for (let i = 0; i < breakpoints.length - 1; i++) {
    const current = breakpoints[i];
    const next = breakpoints[i + 1];
    if (concentration > current.cHigh && concentration < next.cLow) {
      // Between bands: linear step to next band
      const rangeC = next.cLow - current.cHigh;
      const rangeI = next.iLow - current.iHigh;
      const sub = current.iHigh + (rangeI / rangeC) * (concentration - current.cHigh);
      return { subIndex: Math.round(sub), isAboveScale: false };
    }
  }

  return { subIndex: null, isAboveScale: false };
}

/**
 * Converts raw Open-Meteo pollutant readings into CPCB sub-indices and overall AQI.
 * Raw CO from Open-Meteo is provided in µg/m³; we divide by 1000 to convert to mg/m³.
 */
export function calculateCpcbAqi(rawConcentrations: {
  pm2_5?: number | null;
  pm10?: number | null;
  nitrogen_dioxide?: number | null;
  sulphur_dioxide?: number | null;
  ozone?: number | null;
  carbon_monoxide?: number | null; // Note: if pass raw µg/m³, set isCoInMgM3=false
}, isCoInMgM3: boolean = false): AqiResult {
  const pollutants: Record<PollutantKey, PollutantReading> = {
    pm2_5: {
      key: 'pm2_5',
      name: POLLUTANT_METADATA.pm2_5.name,
      value: rawConcentrations.pm2_5 ?? null,
      unit: POLLUTANT_METADATA.pm2_5.unit,
      subIndex: null,
      isAboveScale: false,
      isMissing: rawConcentrations.pm2_5 === null || rawConcentrations.pm2_5 === undefined || isNaN(rawConcentrations.pm2_5),
    },
    pm10: {
      key: 'pm10',
      name: POLLUTANT_METADATA.pm10.name,
      value: rawConcentrations.pm10 ?? null,
      unit: POLLUTANT_METADATA.pm10.unit,
      subIndex: null,
      isAboveScale: false,
      isMissing: rawConcentrations.pm10 === null || rawConcentrations.pm10 === undefined || isNaN(rawConcentrations.pm10),
    },
    nitrogen_dioxide: {
      key: 'nitrogen_dioxide',
      name: POLLUTANT_METADATA.nitrogen_dioxide.name,
      value: rawConcentrations.nitrogen_dioxide ?? null,
      unit: POLLUTANT_METADATA.nitrogen_dioxide.unit,
      subIndex: null,
      isAboveScale: false,
      isMissing: rawConcentrations.nitrogen_dioxide === null || rawConcentrations.nitrogen_dioxide === undefined || isNaN(rawConcentrations.nitrogen_dioxide),
    },
    sulphur_dioxide: {
      key: 'sulphur_dioxide',
      name: POLLUTANT_METADATA.sulphur_dioxide.name,
      value: rawConcentrations.sulphur_dioxide ?? null,
      unit: POLLUTANT_METADATA.sulphur_dioxide.unit,
      subIndex: null,
      isAboveScale: false,
      isMissing: rawConcentrations.sulphur_dioxide === null || rawConcentrations.sulphur_dioxide === undefined || isNaN(rawConcentrations.sulphur_dioxide),
    },
    ozone: {
      key: 'ozone',
      name: POLLUTANT_METADATA.ozone.name,
      value: rawConcentrations.ozone ?? null,
      unit: POLLUTANT_METADATA.ozone.unit,
      subIndex: null,
      isAboveScale: false,
      isMissing: rawConcentrations.ozone === null || rawConcentrations.ozone === undefined || isNaN(rawConcentrations.ozone),
    },
    carbon_monoxide: {
      key: 'carbon_monoxide',
      name: POLLUTANT_METADATA.carbon_monoxide.name,
      // Open-Meteo returns CO in µg/m³. CPCB requires mg/m³.
      // Conversion: divide by 1000 if not already in mg/m³.
      value: rawConcentrations.carbon_monoxide !== null && rawConcentrations.carbon_monoxide !== undefined && !isNaN(rawConcentrations.carbon_monoxide)
        ? (isCoInMgM3 ? rawConcentrations.carbon_monoxide : rawConcentrations.carbon_monoxide / 1000)
        : null,
      unit: POLLUTANT_METADATA.carbon_monoxide.unit,
      subIndex: null,
      isAboveScale: false,
      isMissing: rawConcentrations.carbon_monoxide === null || rawConcentrations.carbon_monoxide === undefined || isNaN(rawConcentrations.carbon_monoxide),
    },
  };

  let validCount = 0;
  let hasParticulate = false;
  let maxSubIndex = -1;
  let dominantKey: PollutantKey | null = null;
  let anyAboveScale = false;

  for (const key of Object.keys(pollutants) as PollutantKey[]) {
    const p = pollutants[key];
    if (p.value !== null && !isNaN(p.value) && p.value >= 0) {
      const { subIndex, isAboveScale } = calculateSubIndex(key, p.value);
      p.subIndex = subIndex;
      p.isAboveScale = isAboveScale;

      if (subIndex !== null) {
        validCount++;
        if (key === 'pm2_5' || key === 'pm10') {
          hasParticulate = true;
        }
        if (subIndex > maxSubIndex) {
          maxSubIndex = subIndex;
          dominantKey = key;
        }
        if (isAboveScale) {
          anyAboveScale = true;
        }
      }
    }
  }

  // 3-Pollutant Rule:
  // Must have at least 3 valid pollutants AND at least one must be PM2.5 or PM10.
  const meetsCriteria = validCount >= 3 && hasParticulate && maxSubIndex >= 0;

  if (!meetsCriteria) {
    return {
      aqi: null,
      category: 'Indeterminate',
      categoryDescription: 'Insufficient pollutant data to compute CPCB AQI (requires at least 3 pollutants with PM2.5 or PM10).',
      dominantPollutant: null,
      dominantPollutantKey: null,
      isAboveScale: anyAboveScale,
      pollutants,
      validPollutantCount: validCount,
      hasParticulate,
      meetsCalculationCriteria: false,
      calculationNote: 'Indeterminate: Requires at least 3 valid pollutants including PM2.5 or PM10.',
    };
  }

  const overallAqi = maxSubIndex;
  const category = getAqiCategory(overallAqi);

  return {
    aqi: overallAqi,
    category,
    categoryDescription: getCategoryDescription(category),
    dominantPollutant: dominantKey ? POLLUTANT_METADATA[dominantKey].name : null,
    dominantPollutantKey: dominantKey,
    isAboveScale: anyAboveScale,
    pollutants,
    validPollutantCount: validCount,
    hasParticulate,
    meetsCalculationCriteria: true,
    calculationNote: anyAboveScale
      ? 'Estimated CPCB-style AQI from hourly model data (one or more pollutants capped at 500: above scale).'
      : 'Estimated CPCB-style AQI from hourly model data.',
  };
}

export function getAqiCategory(aqi: number | null): AqiCategory {
  if (aqi === null || isNaN(aqi)) return 'Indeterminate';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

export function getCategoryDescription(category: AqiCategory): string {
  switch (category) {
    case 'Good':
      return 'Minimal impact. Air quality is considered safe for normal outdoor activities.';
    case 'Satisfactory':
      return 'Minor breathing discomfort may occur in sensitive people.';
    case 'Moderate':
      return 'Breathing discomfort to people with lungs, asthma, and heart conditions.';
    case 'Poor':
      return 'Breathing discomfort to most people on prolonged outdoor exposure.';
    case 'Very Poor':
      return 'Respiratory illness on prolonged exposure. Significant impact on vulnerable people.';
    case 'Severe':
      return 'Affects healthy people and seriously impacts those with existing conditions.';
    case 'Indeterminate':
      return 'Insufficient data to compute AQI.';
  }
}
