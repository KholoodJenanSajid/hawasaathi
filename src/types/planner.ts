export type EffortLevel = 'Low' | 'Medium' | 'High';

export type CostBandLabel =
  | 'Free'
  | 'Under ₹1,500'
  | '₹1,500–₹12,000'
  | 'Premium';

export type SourceNoteType =
  | 'model data'
  | 'household profile'
  | 'public-health rule';

export interface Recommendation {
  id: string;
  action: string;
  when: string;
  why: string;
  who: string;
  effort: EffortLevel;
  costBand: CostBandLabel;
  directImpact: string;
  limitation: string;
  sourceNote: SourceNoteType;
}

export interface DayPartRoutine {
  part:
    | 'Early Morning'
    | 'School or Work Trip'
    | 'Midday'
    | 'Cooking'
    | 'Evening Outdoors'
    | 'Night';
  timeRange: string;
  airQualityContext: string;
  actions: Recommendation[];
  cautionForVulnerable: string | null;
}

export interface RoomHelperResult {
  lengthM: number;
  widthM: number;
  heightM: number;
  volumeM3: number;
  targetAch: number; // 5, or 6 if vulnerability flag is set
  cadrM3h: number; // CADR hint = volume × ACH
  cadrCfm: number; // CADR in CFM (m³/h / 1.7)
  sizingHintNote: string;
  disclaimer: string;
}

export interface SwapItem {
  id: string;
  category: 'Transport' | 'Household Habits' | 'Community Action';
  currentHabit: string;
  alternative: string;
  effort: EffortLevel;
  roughCostRupees: string;
  whatImproves: string;
  whatItDoesNotChange: string;
  transportImpact?: {
    weeklyKgCo2e: number;
    monthlyKgCo2e: number;
    annualKgCo2e: number;
    annualRangeKgCo2e: [number, number];
    factorVersion: string;
    assumption: string;
  };
}
