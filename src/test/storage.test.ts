import { describe, it, expect, beforeEach } from 'vitest';
import {
  roundCoordinate,
  loadProfile,
  saveProfile,
  resetProfile,
  clearAllLocalData,
  STORAGE_KEY,
} from '../lib/storage';
import { DEFAULT_PROFILE, UserProfile } from '../types/profile';

describe('Storage & Profile Schema Validation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('rounds coordinates to approximately 1 km resolution (~2 decimal places)', () => {
    expect(roundCoordinate(28.614321)).toBe(28.61);
    expect(roundCoordinate(77.209023)).toBe(77.21);
    expect(roundCoordinate(19.07609)).toBe(19.08);
  });

  it('saves and loads a valid profile with rounded coordinates', () => {
    const customProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      location: {
        cityName: 'Lucknow',
        latitude: 26.8467,
        longitude: 80.9462,
        state: 'Uttar Pradesh',
        country: 'India',
      },
      household: {
        adults: 3,
        children: 2,
        olderAdults: 1,
        outdoorWorker: true,
        hasVulnerability: true,
      },
    };

    saveProfile(customProfile);
    const loaded = loadProfile();

    expect(loaded.location.cityName).toBe('Lucknow');
    expect(loaded.location.latitude).toBe(26.85); // Rounded
    expect(loaded.location.longitude).toBe(80.95); // Rounded
    expect(loaded.household.children).toBe(2);
    expect(loaded.household.olderAdults).toBe(1);
    expect(loaded.household.hasVulnerability).toBe(true);
  });

  it('discards corrupt localStorage data and returns the default profile safely', () => {
    // Malformed JSON
    localStorage.setItem(STORAGE_KEY, '{ corrupt-json ...');
    expect(loadProfile()).toEqual(DEFAULT_PROFILE);

    // Schema mismatch (missing location or wrong types)
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ location: { cityName: 123 }, household: 'none' })
    );
    expect(loadProfile()).toEqual(DEFAULT_PROFILE);
  });

  it('resets profile to default baseline', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_PROFILE, location: { ...DEFAULT_PROFILE.location, cityName: 'Mumbai' } })
    );

    const reset = resetProfile();
    expect(reset.location.cityName).toBe('Delhi');
    expect(loadProfile().location.cityName).toBe('Delhi');
  });

  it('clears all local data completely', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PROFILE));
    localStorage.setItem('hawasaathi_cache_test', '12345');

    clearAllLocalData();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem('hawasaathi_cache_test')).toBeNull();
  });
});
