import { describe, it, expect } from 'vitest';
import {
  calculateSubIndex,
  calculateCpcbAqi,
} from '../lib/aqi';

describe('CPCB AQI Linear Interpolation & Breakpoints', () => {
  it('correctly calculates sub-indices for PM2.5 in each band', () => {
    // Band 1: 0-30 -> 0-50
    expect(calculateSubIndex('pm2_5', 15).subIndex).toBe(25);
    expect(calculateSubIndex('pm2_5', 30).subIndex).toBe(50);

    // Band 2: 31-60 -> 51-100
    expect(calculateSubIndex('pm2_5', 45).subIndex).toBe(75);
    expect(calculateSubIndex('pm2_5', 60).subIndex).toBe(100);

    // Band 3: 61-90 -> 101-200
    expect(calculateSubIndex('pm2_5', 75).subIndex).toBe(149); // 101 + (99/29)*14 ≈ 149
    expect(calculateSubIndex('pm2_5', 90).subIndex).toBe(200);

    // Band 4: 91-120 -> 201-300
    expect(calculateSubIndex('pm2_5', 105).subIndex).toBe(249);
    expect(calculateSubIndex('pm2_5', 120).subIndex).toBe(300);

    // Band 5: 121-250 -> 301-400
    expect(calculateSubIndex('pm2_5', 185).subIndex).toBe(350);
    expect(calculateSubIndex('pm2_5', 250).subIndex).toBe(400);

    // Band 6: 251-500 -> 401-500
    expect(calculateSubIndex('pm2_5', 375).subIndex).toBe(450);
    expect(calculateSubIndex('pm2_5', 500).subIndex).toBe(500);
  });

  it('correctly caps sub-index at 500 and flags above scale for extreme pollution', () => {
    const extremePm25 = calculateSubIndex('pm2_5', 650);
    expect(extremePm25.subIndex).toBe(500);
    expect(extremePm25.isAboveScale).toBe(true);

    const extremePm10 = calculateSubIndex('pm10', 800);
    expect(extremePm10.subIndex).toBe(500);
    expect(extremePm10.isAboveScale).toBe(true);

    const normal = calculateSubIndex('pm2_5', 200);
    expect(normal.isAboveScale).toBe(false);
  });

  it('enforces CO conversion from µg/m³ to mg/m³', () => {
    // Open-Meteo returns CO in µg/m³ (e.g. 2500 µg/m³ = 2.5 mg/m³)
    // In CPCB bands: 2.1 - 10.0 mg/m³ -> 101 - 200
    const rawUgM3 = 2500;
    const result = calculateCpcbAqi({
      pm2_5: 50,
      pm10: 80,
      carbon_monoxide: rawUgM3, // Raw µg/m³, isCoInMgM3 = false
    });

    const coReading = result.pollutants.carbon_monoxide;
    expect(coReading.value).toBe(2.5); // Converted to mg/m³
    expect(coReading.unit).toBe('mg/m³');
    expect(coReading.subIndex).toBeGreaterThanOrEqual(101);
    expect(coReading.subIndex).toBeLessThanOrEqual(200);
  });

  it('strictly enforces the 3-pollutant rule including PM2.5 or PM10', () => {
    // Case A: Only 2 pollutants present -> Indeterminate
    const twoPollutants = calculateCpcbAqi({
      pm2_5: 150,
      pm10: 220,
    });
    expect(twoPollutants.aqi).toBeNull();
    expect(twoPollutants.category).toBe('Indeterminate');
    expect(twoPollutants.meetsCalculationCriteria).toBe(false);

    // Case B: 3 gaseous pollutants present but NEITHER PM2.5 nor PM10 -> Indeterminate
    const threeGaseous = calculateCpcbAqi({
      nitrogen_dioxide: 80,
      sulphur_dioxide: 60,
      ozone: 90,
    });
    expect(threeGaseous.aqi).toBeNull();
    expect(threeGaseous.category).toBe('Indeterminate');
    expect(threeGaseous.hasParticulate).toBe(false);

    // Case C: 3 pollutants present including PM2.5 -> Valid overall AQI is the max sub-index
    const validCase = calculateCpcbAqi({
      pm2_5: 100, // subIndex in 201-300 band
      nitrogen_dioxide: 40, // subIndex 50
      sulphur_dioxide: 30, // subIndex ~38
    });
    expect(validCase.meetsCalculationCriteria).toBe(true);
    expect(validCase.aqi).toBeGreaterThanOrEqual(201);
    expect(validCase.aqi).toBeLessThanOrEqual(300);
    expect(validCase.dominantPollutant).toBe('PM2.5');
    expect(validCase.category).toBe('Poor');
  });

  it('handles missing and negative data gracefully without inventing numbers', () => {
    const missingCase = calculateCpcbAqi({
      pm2_5: null,
      pm10: undefined,
      nitrogen_dioxide: -10, // Invalid negative
      sulphur_dioxide: 50,
      ozone: null,
      carbon_monoxide: undefined,
    });

    expect(missingCase.pollutants.pm2_5.isMissing).toBe(true);
    expect(missingCase.pollutants.pm2_5.value).toBeNull();
    expect(missingCase.pollutants.pm2_5.subIndex).toBeNull();
    expect(missingCase.aqi).toBeNull();
  });
});
