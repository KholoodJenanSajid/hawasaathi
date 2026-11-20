export type PollutantKey =
  | 'pm2_5'
  | 'pm10'
  | 'nitrogen_dioxide'
  | 'sulphur_dioxide'
  | 'ozone'
  | 'carbon_monoxide';

export type AqiCategory =
  | 'Good'
  | 'Satisfactory'
  | 'Moderate'
  | 'Poor'
  | 'Very Poor'
  | 'Severe'
  | 'Indeterminate';

export interface PollutantReading {
  key: PollutantKey;
  name: string;
  value: number | null;
  unit: string; // 'µg/m³' or 'mg/m³'
  subIndex: number | null;
  isAboveScale: boolean;
  isMissing: boolean;
}

export interface AqiResult {
  aqi: number | null;
  category: AqiCategory;
  categoryDescription: string;
  dominantPollutant: string | null;
  dominantPollutantKey: PollutantKey | null;
  isAboveScale: boolean;
  pollutants: Record<PollutantKey, PollutantReading>;
  validPollutantCount: number;
  hasParticulate: boolean;
  meetsCalculationCriteria: boolean;
  calculationNote: string;
}

export interface HourlyAirPoint {
  time: string; // ISO string
  displayTime: string; // e.g. "08:00"
  hour: number; // 0 - 23
  pm2_5: number | null;
  pm10: number | null;
  nitrogen_dioxide: number | null;
  sulphur_dioxide: number | null;
  ozone: number | null;
  carbon_monoxide: number | null; // mg/m³
  rawCoUgM3: number | null;
  aqi: number | null;
  category: AqiCategory;
  temp: number | null;
  humidity: number | null;
  windSpeed: number | null;
}

export interface Window2Hour {
  startHour: number;
  endHour: number;
  label: string; // e.g. "1:00 PM – 3:00 PM"
  avgAqi: number | null;
  avgPm25: number | null;
  category: AqiCategory;
  reason: string;
}

export interface AirDataState {
  current: AqiResult | null;
  currentHourly: HourlyAirPoint | null;
  hourly24h: HourlyAirPoint[];
  cleanestWindow: Window2Hour | null;
  dirtiestWindow: Window2Hour | null;
  weather: {
    temp: number;
    humidity: number;
    windSpeed: number;
  } | null;
  dataTimestamp: string | null;
  timezone: string;
  provider: string;
  lastSuccessTime: string | null;
  error: string | null;
  loading: boolean;
}
