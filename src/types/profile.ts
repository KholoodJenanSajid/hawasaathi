import { z } from 'zod';

export type CommuteMode =
  | 'walk'
  | 'cycle'
  | 'two_wheeler'
  | 'car'
  | 'carpool'
  | 'metro_bus'
  | 'work_from_home';

export type CookingFuel = 'lpg' | 'induction' | 'biomass_chulha';

export type BudgetBand = 'free' | 'under_1500' | '1500_to_12000' | 'premium';

export type ExerciseTiming = 'none' | 'early_morning' | 'midday' | 'evening';

export const LocationProfileSchema = z.object({
  cityName: z.string().min(1, 'City name is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  state: z.string().optional(),
  country: z.string().default('India'),
});

export const HouseholdMembersSchema = z.object({
  adults: z.number().int().min(1).max(20).default(2),
  children: z.number().int().min(0).max(20).default(1),
  olderAdults: z.number().int().min(0).max(20).default(0),
  outdoorWorker: z.boolean().default(false),
  hasVulnerability: z.boolean().default(false), // Sensitivity preference flag only (never diagnosis)
});

export const LifestyleProfileSchema = z.object({
  commuteMode: z
    .enum([
      'walk',
      'cycle',
      'two_wheeler',
      'car',
      'carpool',
      'metro_bus',
      'work_from_home',
    ])
    .default('two_wheeler'),
  oneWayKm: z.number().min(0).max(200).default(8),
  commuteDaysPerWeek: z.number().min(0).max(7).default(5),
  carpoolOccupancy: z.number().min(2).max(6).default(3),
  outdoorExerciseTiming: z
    .enum(['none', 'early_morning', 'midday', 'evening'])
    .default('early_morning'),
  cookingFuel: z.enum(['lpg', 'induction', 'biomass_chulha']).default('lpg'),
  incenseOrMosquitoCoil: z.boolean().default(false),
  hasPurifier: z.boolean().default(false),
  roomLengthMeters: z.number().min(1).max(30).default(4),
  roomWidthMeters: z.number().min(1).max(30).default(3.5),
  roomHeightMeters: z.number().min(1.5).max(10).default(2.8),
  budgetBand: z
    .enum(['free', 'under_1500', '1500_to_12000', 'premium'])
    .default('1500_to_12000'),
});

export const UserProfileSchema = z.object({
  version: z.number().default(1),
  location: LocationProfileSchema,
  household: HouseholdMembersSchema,
  lifestyle: LifestyleProfileSchema,
  onboardingCompleted: z.boolean().default(false),
});

export type LocationProfile = z.infer<typeof LocationProfileSchema>;
export type HouseholdMembers = z.infer<typeof HouseholdMembersSchema>;
export type LifestyleProfile = z.infer<typeof LifestyleProfileSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const DEFAULT_PROFILE: UserProfile = {
  version: 1,
  location: {
    cityName: 'Delhi',
    latitude: 28.61, // ~1km rounded
    longitude: 77.21,
    state: 'Delhi',
    country: 'India',
  },
  household: {
    adults: 2,
    children: 1,
    olderAdults: 0,
    outdoorWorker: false,
    hasVulnerability: false,
  },
  lifestyle: {
    commuteMode: 'two_wheeler',
    oneWayKm: 8,
    commuteDaysPerWeek: 5,
    carpoolOccupancy: 3,
    outdoorExerciseTiming: 'early_morning',
    cookingFuel: 'lpg',
    incenseOrMosquitoCoil: false,
    hasPurifier: false,
    roomLengthMeters: 4,
    roomWidthMeters: 3.5,
    roomHeightMeters: 2.8,
    budgetBand: '1500_to_12000',
  },
  onboardingCompleted: false,
};
