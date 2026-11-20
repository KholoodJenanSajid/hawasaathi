import { DEFAULT_PROFILE, UserProfile, UserProfileSchema } from '../types/profile';

export const STORAGE_KEY = 'hawasaathi_profile_v1';

/**
 * Rounds latitude and longitude to approximately 1 km resolution (~2 decimal places / 0.01 degree).
 * Protects user privacy while providing accurate micro-climate air forecasting.
 */
export function roundCoordinate(coord: number): number {
  return Number(coord.toFixed(2));
}

/**
 * Loads the user profile from localStorage with strict Zod schema validation.
 * If data is corrupt or invalid, it is safely discarded and the default profile is returned.
 */
export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PROFILE;
    }
    const parsed = JSON.parse(raw);
    const validated = UserProfileSchema.safeParse(parsed);
    if (validated.success) {
      return validated.data;
    }
    console.warn('Profile schema validation failed; resetting to defaults:', validated.error);
    return DEFAULT_PROFILE;
  } catch (error) {
    console.warn('Corrupt localStorage data encountered; resetting to defaults:', error);
    return DEFAULT_PROFILE;
  }
}

/**
 * Saves profile to localStorage after rounding coordinates to ~1 km resolution.
 */
export function saveProfile(profile: UserProfile): void {
  try {
    const sanitized: UserProfile = {
      ...profile,
      location: {
        ...profile.location,
        latitude: roundCoordinate(profile.location.latitude),
        longitude: roundCoordinate(profile.location.longitude),
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch (error) {
    console.error('Failed to save profile to localStorage:', error);
  }
}

/**
 * Resets profile to defaults.
 */
export function resetProfile(): UserProfile {
  saveProfile(DEFAULT_PROFILE);
  return DEFAULT_PROFILE;
}

/**
 * Deletes all local data completely from localStorage.
 */
export function clearAllLocalData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    // Clear any cached open-meteo query keys if any
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('hawasaathi_')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (error) {
    console.error('Failed to clear local data:', error);
  }
}

/**
 * Reads raw stored text for debugging and transparency screen.
 */
export function getRawStoredData(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || '(No data currently stored)';
  } catch {
    return '(Error accessing localStorage)';
  }
}
