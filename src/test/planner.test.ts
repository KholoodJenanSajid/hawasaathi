import { describe, it, expect } from 'vitest';
import {
  findBestAndWorstWindows,
  generateTopThreeActions,
  generateFullDayRoutine,
} from '../lib/planner';
import { HourlyAirPoint, AqiResult } from '../types/air';
import { DEFAULT_PROFILE, UserProfile } from '../types/profile';

describe('Planner & Diurnal Window Selection', () => {
  it('identifies best and worst 2-hour blocks from actual hourly forecast data', () => {
    // Construct 24 hours of data where midday (13:00 - 15:00) is cleanest and night (22:00 - 24:00) is worst
    const hourly: HourlyAirPoint[] = Array.from({ length: 24 }, (_, i) => {
      let aqi = 250;
      if (i === 13 || i === 14) aqi = 90; // Cleanest window
      if (i === 22 || i === 23) aqi = 420; // Dirtiest peak
      return {
        time: `2026-11-21T${i.toString().padStart(2, '0')}:00:00Z`,
        displayTime: `${i}:00`,
        hour: i,
        pm2_5: aqi / 2,
        pm10: aqi,
        nitrogen_dioxide: 40,
        sulphur_dioxide: 20,
        ozone: 50,
        carbon_monoxide: 1.2,
        rawCoUgM3: 1200,
        aqi,
        category: aqi > 300 ? 'Severe' : aqi > 100 ? 'Moderate' : 'Good',
        temp: 22,
        humidity: 50,
        windSpeed: 8,
      };
    });

    const { cleanest, dirtiest } = findBestAndWorstWindows(hourly);

    expect(cleanest).not.toBeNull();
    expect(dirtiest).not.toBeNull();
    expect(cleanest?.startHour).toBe(13);
    expect(cleanest?.avgAqi).toBe(90);
    expect(dirtiest?.startHour).toBe(22);
    expect(dirtiest?.avgAqi).toBe(420);
  });

  it('adjusts top actions when children are in the household', () => {
    const mockAqi: AqiResult = {
      aqi: 280,
      category: 'Poor',
      categoryDescription: 'Poor air',
      dominantPollutant: 'PM2.5',
      dominantPollutantKey: 'pm2_5',
      isAboveScale: false,
      pollutants: {} as any,
      validPollutantCount: 4,
      hasParticulate: true,
      meetsCalculationCriteria: true,
      calculationNote: 'Mock',
    };

    const profileWithChild: UserProfile = {
      ...DEFAULT_PROFILE,
      household: {
        adults: 2,
        children: 2,
        olderAdults: 0,
        outdoorWorker: false,
        hasVulnerability: false,
      },
      lifestyle: {
        ...DEFAULT_PROFILE.lifestyle,
        commuteMode: 'work_from_home', // Not outdoor commute so child action bubbles up
      },
    };

    const actions = generateTopThreeActions(mockAqi, null, null, profileWithChild);
    const childAction = actions.find((a) => a.who.includes('child'));
    expect(childAction).toBeDefined();
    expect(childAction?.action).toContain('children');
  });

  it('adjusts routine caution banner when older adults are present', () => {
    const mockAqi: AqiResult = {
      aqi: 320,
      category: 'Very Poor',
      categoryDescription: 'Very Poor air',
      dominantPollutant: 'PM2.5',
      dominantPollutantKey: 'pm2_5',
      isAboveScale: false,
      pollutants: {} as any,
      validPollutantCount: 4,
      hasParticulate: true,
      meetsCalculationCriteria: true,
      calculationNote: 'Mock',
    };

    const profileWithSenior: UserProfile = {
      ...DEFAULT_PROFILE,
      household: {
        adults: 2,
        children: 0,
        olderAdults: 2,
        outdoorWorker: false,
        hasVulnerability: false,
      },
    };

    const routines = generateFullDayRoutine(mockAqi, null, null, profileWithSenior);
    const morningRoutine = routines.find((r) => r.part === 'Early Morning');

    expect(morningRoutine?.cautionForVulnerable).not.toBeNull();
    expect(morningRoutine?.cautionForVulnerable).toContain('Vulnerable individuals');
  });

  it('prioritizes mosquito coil/incense source control when habit is enabled', () => {
    const profileWithCoil: UserProfile = {
      ...DEFAULT_PROFILE,
      lifestyle: {
        ...DEFAULT_PROFILE.lifestyle,
        incenseOrMosquitoCoil: true,
      },
    };

    const actions = generateTopThreeActions(null, null, null, profileWithCoil);
    const coilAction = actions.find((a) => a.id === 'action-stop-coil');
    expect(coilAction).toBeDefined();
    expect(coilAction?.action).toContain('mosquito coils');
  });
});
