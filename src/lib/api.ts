import { AirDataState, HourlyAirPoint } from '../types/air';
import { calculateCpcbAqi } from './aqi';
import { findBestAndWorstWindows } from './planner';
import { ExplainRequest, ExplainResponse } from '../../api/_shared';

// In-memory 10-minute cache: key -> { timestamp: number, data: AirDataState }
interface CacheEntry {
  timestamp: number;
  data: AirDataState;
}

const AIR_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let activeAirAbortController: AbortController | null = null;

export interface GeocodeResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  country_code?: string;
  admin1?: string; // State
}

/**
 * Searches for Indian cities or global cities with bias to India.
 * Debounced in UI, timeout supported.
 */
export async function searchCities(
  query: string,
  signal?: AbortSignal
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    trimmed
  )}&count=8&language=en&format=json`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  const combinedSignal = signal || controller.signal;

  try {
    const res = await fetch(url, { signal: combinedSignal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Geocoding failed with HTTP status ${res.status}`);
    }

    const data = await res.json();
    const results: GeocodeResult[] = data.results || [];

    // Sort to bias Indian locations first
    return results.sort((a, b) => {
      const aIsIndia = a.country_code?.toUpperCase() === 'IN' || a.country === 'India';
      const bIsIndia = b.country_code?.toUpperCase() === 'IN' || b.country === 'India';
      if (aIsIndia && !bIsIndia) return -1;
      if (!aIsIndia && bIsIndia) return 1;
      return 0;
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      return [];
    }
    console.error('Error searching cities:', error);
    throw error;
  }
}

/**
 * Fetches live air quality and weather from Open-Meteo.
 * Includes in-memory 10-minute caching, 8-second timeout, and stale request abortion.
 */
export async function fetchLiveAirAndWeather(
  latitude: number,
  longitude: number,
  lastKnownSuccessTime?: string | null
): Promise<AirDataState> {
  const cacheKey = `${latitude.toFixed(2)}_${longitude.toFixed(2)}`;
  const cached = AIR_CACHE.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Abort any existing ongoing fetch
  if (activeAirAbortController) {
    activeAirAbortController.abort();
  }
  activeAirAbortController = new AbortController();
  const signal = activeAirAbortController.signal;

  const timeoutId = setTimeout(() => {
    activeAirAbortController?.abort();
  }, 9000);

  try {
    const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&timezone=auto`;
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`;

    const [airRes, weatherRes] = await Promise.all([
      fetch(airQualityUrl, { signal }),
      fetch(weatherUrl, { signal }),
    ]);

    clearTimeout(timeoutId);

    if (!airRes.ok) {
      throw new Error(`Air Quality API error: HTTP status ${airRes.status}`);
    }
    if (!weatherRes.ok) {
      throw new Error(`Weather API error: HTTP status ${weatherRes.status}`);
    }

    const airData = await airRes.json();
    const weatherData = await weatherRes.json();

    const hourlyTimes: string[] = airData.hourly?.time || [];
    const hourlyPm25: (number | null)[] = airData.hourly?.pm2_5 || [];
    const hourlyPm10: (number | null)[] = airData.hourly?.pm10 || [];
    const hourlyCoRaw: (number | null)[] = airData.hourly?.carbon_monoxide || []; // Open-Meteo sends CO in µg/m³
    const hourlyNo2: (number | null)[] = airData.hourly?.nitrogen_dioxide || [];
    const hourlySo2: (number | null)[] = airData.hourly?.sulphur_dioxide || [];
    const hourlyO3: (number | null)[] = airData.hourly?.ozone || [];

    const weatherTimes: string[] = weatherData.hourly?.time || [];
    const weatherTemp: (number | null)[] = weatherData.hourly?.temperature_2m || [];
    const weatherHumidity: (number | null)[] = weatherData.hourly?.relative_humidity_2m || [];
    const weatherWind: (number | null)[] = weatherData.hourly?.wind_speed_10m || [];

    // Map hourly data into 24-hour array starting from current hour
    const nowIso = new Date().toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
    let currentHourIdx = hourlyTimes.findIndex((t) => t.startsWith(nowIso));
    if (currentHourIdx === -1) {
      currentHourIdx = 0; // fallback to start of array
    }

    const hourly24h: HourlyAirPoint[] = [];
    const sliceCount = Math.min(24, hourlyTimes.length - currentHourIdx);

    for (let i = 0; i < (sliceCount > 0 ? sliceCount : Math.min(24, hourlyTimes.length)); i++) {
      const idx = currentHourIdx + i;
      const timeStr = hourlyTimes[idx];
      const dateObj = new Date(timeStr);
      const hour = dateObj.getHours();

      // Open-Meteo CO arrives as µg/m³. Convert to mg/m³ for CPCB: divide by 1000
      const rawCo = hourlyCoRaw[idx] ?? null;
      const coMgM3 = rawCo !== null && !isNaN(rawCo) ? Number((rawCo / 1000).toFixed(2)) : null;

      const pm2_5 = hourlyPm25[idx] ?? null;
      const pm10 = hourlyPm10[idx] ?? null;
      const nitrogen_dioxide = hourlyNo2[idx] ?? null;
      const sulphur_dioxide = hourlySo2[idx] ?? null;
      const ozone = hourlyO3[idx] ?? null;

      const aqiRes = calculateCpcbAqi({
        pm2_5,
        pm10,
        nitrogen_dioxide,
        sulphur_dioxide,
        ozone,
        carbon_monoxide: coMgM3,
      }, true); // isCoInMgM3 = true

      // Find corresponding weather index
      const wIdx = weatherTimes.findIndex((wt) => wt === timeStr);

      hourly24h.push({
        time: timeStr,
        displayTime: `${hour.toString().padStart(2, '0')}:00`,
        hour,
        pm2_5,
        pm10,
        nitrogen_dioxide,
        sulphur_dioxide,
        ozone,
        carbon_monoxide: coMgM3,
        rawCoUgM3: rawCo,
        aqi: aqiRes.aqi,
        category: aqiRes.category,
        temp: wIdx !== -1 ? weatherTemp[wIdx] ?? null : null,
        humidity: wIdx !== -1 ? weatherHumidity[wIdx] ?? null : null,
        windSpeed: wIdx !== -1 ? weatherWind[wIdx] ?? null : null,
      });
    }

    // Current conditions
    const currentPoint = hourly24h[0] || null;
    const currentAqi = currentPoint
      ? calculateCpcbAqi({
          pm2_5: currentPoint.pm2_5,
          pm10: currentPoint.pm10,
          nitrogen_dioxide: currentPoint.nitrogen_dioxide,
          sulphur_dioxide: currentPoint.sulphur_dioxide,
          ozone: currentPoint.ozone,
          carbon_monoxide: currentPoint.carbon_monoxide,
        }, true)
      : null;

    const { cleanest, dirtiest } = findBestAndWorstWindows(hourly24h);

    const currentWeather = weatherData.current
      ? {
          temp: Math.round(weatherData.current.temperature_2m),
          humidity: Math.round(weatherData.current.relative_humidity_2m),
          windSpeed: Math.round(weatherData.current.wind_speed_10m),
        }
      : null;

    const successTimestamp = new Date().toISOString();

    const state: AirDataState = {
      current: currentAqi,
      currentHourly: currentPoint,
      hourly24h,
      cleanestWindow: cleanest,
      dirtiestWindow: dirtiest,
      weather: currentWeather,
      dataTimestamp: currentPoint?.time || successTimestamp,
      timezone: airData.timezone || 'auto',
      provider: 'Open-Meteo (Copernicus CAMS & ECMWF)',
      lastSuccessTime: successTimestamp,
      error: null,
      loading: false,
    };

    AIR_CACHE.set(cacheKey, { timestamp: now, data: state });
    return state;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Failed to fetch Open-Meteo air and weather data:', error);
    const errMessage =
      (error as Error).name === 'AbortError'
        ? 'Data request timed out. Please check your connection and retry.'
        : `Unable to load live air data: ${(error as Error).message || 'Network error'}`;

    return {
      current: null,
      currentHourly: null,
      hourly24h: [],
      cleanestWindow: null,
      dirtiestWindow: null,
      weather: null,
      dataTimestamp: null,
      timezone: 'UTC',
      provider: 'Open-Meteo',
      lastSuccessTime: lastKnownSuccessTime || null,
      error: errMessage,
      loading: false,
    };
  }
}

/**
 * Calls backend /api/explain endpoint.
 */
export async function askHawaSaathi(
  request: ExplainRequest
): Promise<ExplainResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP error ${res.status}`);
    }

    const data: ExplainResponse = await res.json();
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('Explain endpoint call failed, returning fallback client-side:', err);
    throw err;
  }
}

/**
 * Checks if Gemini is configured on the backend.
 */
export async function checkBackendHealth(): Promise<{ geminiConfigured: boolean }> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return { geminiConfigured: false };
    return await res.json();
  } catch {
    return { geminiConfigured: false };
  }
}
