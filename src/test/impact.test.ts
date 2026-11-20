import { describe, it, expect } from 'vitest';
import {
  calculateTransportEmissions,
  calculateExposureProxy,
  calculateRoomCadrHint,
  IMPACT_MATH_VERSION,
  TRANSPORT_EMISSION_FACTORS,
} from '../lib/impact';

describe('Deterministic Impact Math (hawasaathi-planning-2026.1)', () => {
  it('has consistent version string', () => {
    expect(IMPACT_MATH_VERSION).toBe('hawasaathi-planning-2026.1');
  });

  describe('Transport Emission Calculations', () => {
    it('accurately computes solo car baseline and ±20% planning range', () => {
      // 10 km one-way, 5 days/wk:
      // annualKm = 10 * 2 * 5 * 52 = 5,200 km
      // car factor = 0.170 kg CO2e/km
      // annual emissions = 5,200 * 0.170 = 884.0 kg CO2e
      const result = calculateTransportEmissions('car', 10, 5);

      expect(result.version).toBe('hawasaathi-planning-2026.1');
      expect(result.annualKm).toBe(5200);
      expect(result.annualKgCo2e).toBe(884.0);
      expect(result.weeklyKgCo2e).toBe(17.0); // 884 / 52
      expect(result.monthlyKgCo2e).toBe(73.7); // 884 / 12

      // ±20% planning range
      expect(result.annualRangeKgCo2e[0]).toBe(707.2); // 884 * 0.8
      expect(result.annualRangeKgCo2e[1]).toBe(1060.8); // 884 * 1.2

      expect(result.isZeroTailpipe).toBe(false);
      expect(result.savedVsCarAnnualKg).toBe(0);
    });

    it('correctly allocates emissions for carpooling by occupancy', () => {
      // Carpool with 4 occupants:
      // factor = 0.170 / 4 = 0.0425 kg CO2e/p-km
      // annualKm = 5,200 km
      // annual emissions = 5,200 * 0.0425 = 221.0 kg CO2e
      const result = calculateTransportEmissions('carpool', 10, 5, 4);

      expect(result.currentFactor).toBeCloseTo(0.0425, 4);
      expect(result.annualKgCo2e).toBe(221.0);
      expect(result.carpoolOccupancy).toBe(4);
      expect(result.savedVsCarAnnualKg).toBe(663.0); // 884 - 221
      expect(result.annualRangeKgCo2e[0]).toBe(176.8); // 221 * 0.8
      expect(result.annualRangeKgCo2e[1]).toBe(265.2); // 221 * 1.2
    });

    it('treats walking and cycling as near-zero tailpipe without fake sub-gram precision', () => {
      const walkResult = calculateTransportEmissions('walk', 5, 5);
      expect(walkResult.isZeroTailpipe).toBe(true);
      expect(walkResult.annualKgCo2e).toBe(0);
      expect(walkResult.weeklyKgCo2e).toBe(0);
      expect(walkResult.monthlyKgCo2e).toBe(0);
      expect(walkResult.annualRangeKgCo2e).toEqual([0, 0]);

      const cycleResult = calculateTransportEmissions('cycle', 8, 5);
      expect(cycleResult.isZeroTailpipe).toBe(true);
      expect(cycleResult.annualKgCo2e).toBe(0);
    });

    it('fails if someone alters published emission factors', () => {
      expect(TRANSPORT_EMISSION_FACTORS.car.factorKgPerKm).toBe(0.170);
      expect(TRANSPORT_EMISSION_FACTORS.two_wheeler.factorKgPerKm).toBe(0.045);
      expect(TRANSPORT_EMISSION_FACTORS.cycle.factorKgPerKm).toBe(0.0);
      expect(TRANSPORT_EMISSION_FACTORS.walk.factorKgPerKm).toBe(0.0);
    });
  });

  describe('Outdoor Time Exposure Proxy', () => {
    it('calculates concentration-time proxy correctly', () => {
      // PM2.5 = 180 µg/m³, 2.5 hours outside = 450 µg·h/m³
      const proxy = calculateExposureProxy(180, 2.5);
      expect(proxy.proxyValue).toBe(450.0);
      expect(proxy.unit).toBe('µg·h/m³');
    });

    it('strictly enforces public-health safety wording', () => {
      const proxy = calculateExposureProxy(200, 2);
      expect(proxy.label).toContain('concentration-time proxy');
      expect(proxy.safetyNotice).toContain('not an inhaled dose');
      expect(proxy.safetyNotice).toContain('not a health risk score');
    });
  });

  describe('Room Helper CADR Sizing Hint', () => {
    it('calculates standard 5 ACH for room volume', () => {
      // 4m × 3.5m × 2.8m = 39.2 m³
      // Target = 5 ACH -> CADR = 39.2 * 5 ≈ 196 m³/h
      const hint = calculateRoomCadrHint(4, 3.5, 2.8, false);
      expect(hint.volumeM3).toBe(39.2);
      expect(hint.targetAch).toBe(5);
      expect(hint.cadrM3h).toBe(196);
      expect(hint.cadrCfm).toBe(Math.round(196 / 1.7));
    });

    it('increases to 6 ACH when vulnerability flag is set', () => {
      // 4m × 3.5m × 2.8m = 39.2 m³
      // Target = 6 ACH -> CADR = 39.2 * 6 ≈ 235 m³/h
      const hint = calculateRoomCadrHint(4, 3.5, 2.8, true);
      expect(hint.targetAch).toBe(6);
      expect(hint.cadrM3h).toBe(235);
    });

    it('strictly labels CADR as a sizing hint and not a predicted concentration', () => {
      const hint = calculateRoomCadrHint(5, 4, 3);
      expect(hint.sizingHintNote).toContain('Estimated sizing hint');
      expect(hint.disclaimer).toContain('sizing hint only, not a predicted indoor concentration');
    });
  });
});
