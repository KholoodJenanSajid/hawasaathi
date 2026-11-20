import { HourlyAirPoint, Window2Hour, AqiResult } from '../types/air';
import { UserProfile } from '../types/profile';
import {
  DayPartRoutine,
  Recommendation,
  SwapItem,
} from '../types/planner';
import { calculateTransportEmissions } from './impact';

/**
 * Finds the cleanest and dirtiest consecutive 2-hour windows from today's 24-hour forecast.
 * Uses moving 2-hour averages of AQI (or PM2.5).
 */
export function findBestAndWorstWindows(
  hourly: HourlyAirPoint[]
): {
  cleanest: Window2Hour | null;
  dirtiest: Window2Hour | null;
} {
  if (!hourly || hourly.length < 2) {
    return { cleanest: null, dirtiest: null };
  }

  // Only evaluate up to the first 24 hours
  const hours24 = hourly.slice(0, 24);
  let minAvgAqi = Infinity;
  let maxAvgAqi = -Infinity;
  let cleanestIdx = -1;
  let dirtiestIdx = -1;

  for (let i = 0; i < hours24.length - 1; i++) {
    const p1 = hours24[i];
    const p2 = hours24[i + 1];

    const val1 = p1.aqi ?? p1.pm2_5 ?? null;
    const val2 = p2.aqi ?? p2.pm2_5 ?? null;

    if (val1 !== null && val2 !== null) {
      const avg = (val1 + val2) / 2;
      if (avg < minAvgAqi) {
        minAvgAqi = avg;
        cleanestIdx = i;
      }
      if (avg > maxAvgAqi) {
        maxAvgAqi = avg;
        dirtiestIdx = i;
      }
    }
  }

  const formatWindowLabel = (h1: number, h2: number): string => {
    const fmt = (h: number) => {
      const period = h >= 12 ? 'PM' : 'AM';
      const hr = h % 12 === 0 ? 12 : h % 12;
      return `${hr}:00 ${period}`;
    };
    return `${fmt(h1)} – ${fmt((h2 + 1) % 24)}`;
  };

  const createNotice = (
    idx: number,
    isCleanest: boolean
  ): Window2Hour | null => {
    if (idx === -1) return null;
    const p1 = hours24[idx];
    const p2 = hours24[idx + 1];
    const avgAqi =
      p1.aqi !== null && p2.aqi !== null
        ? Math.round((p1.aqi + p2.aqi) / 2)
        : null;
    const avgPm25 =
      p1.pm2_5 !== null && p2.pm2_5 !== null
        ? Math.round((p1.pm2_5 + p2.pm2_5) / 2)
        : null;

    const label = formatWindowLabel(p1.hour, p2.hour);

    return {
      startHour: p1.hour,
      endHour: (p2.hour + 1) % 24,
      label,
      avgAqi,
      avgPm25,
      category: p1.category,
      reason: isCleanest
        ? `Forecast shows lowest particulate levels for the day around ${label}. Best window for brief cross-ventilation.`
        : `Forecast shows diurnal inversion and traffic peak around ${label}. Keep windows tightly shut and avoid outdoor exertion.`,
    };
  };

  return {
    cleanest: createNotice(cleanestIdx, true),
    dirtiest: createNotice(dirtiestIdx, false),
  };
}

/**
 * Computes the top 3 high-priority actions for the household today.
 */
export function generateTopThreeActions(
  aqiResult: AqiResult | null,
  cleanestWindow: Window2Hour | null,
  dirtiestWindow: Window2Hour | null,
  profile: UserProfile
): Recommendation[] {
  const actions: Recommendation[] = [];
  const aqi = aqiResult?.aqi ?? 250;
  const isSevereOrVeryPoor = aqi > 300;
  const isPoorOrWorse = aqi > 200;
  const hasChildren = profile.household.children > 0;
  const hasSeniors = profile.household.olderAdults > 0;
  const hasVulnerable = profile.household.hasVulnerability || hasChildren || hasSeniors;
  const isCommutingOutdoor =
    profile.lifestyle.commuteMode === 'two_wheeler' ||
    profile.lifestyle.commuteMode === 'cycle' ||
    profile.lifestyle.commuteMode === 'walk';

  // Action 1: Timed ventilation vs Window sealing based on actual hourly forecast
  if (cleanestWindow && dirtiestWindow) {
    if (isSevereOrVeryPoor) {
      actions.push({
        id: 'action-vent-timing',
        action: `Keep windows sealed during peak smog; limit ventilation to ${cleanestWindow.label}`,
        when: cleanestWindow.label,
        why: `Outdoor levels surge during ${dirtiestWindow.label}. Only open windows briefly if outdoor air drops lower than stale indoor air.`,
        who: hasVulnerable ? 'All household members, especially children and older adults' : 'Whole household',
        effort: 'Low',
        costBand: 'Free',
        directImpact: 'Avoids letting peak particulate pollution flood inside the home.',
        limitation: 'Does not clean existing indoor dust; pair with a sealed room or air filtration.',
        sourceNote: 'model data',
      });
    } else {
      actions.push({
        id: 'action-vent-clean',
        action: `Perform a 20-minute cross-ventilation flush during ${cleanestWindow.label}`,
        when: cleanestWindow.label,
        why: `This 2-hour window represents the cleanest ambient air today (${cleanestWindow.avgPm25 ?? 'lower'} µg/m³ PM2.5).`,
        who: 'Whole household',
        effort: 'Low',
        costBand: 'Free',
        directImpact: 'Displaces accumulated indoor carbon dioxide and VOCs with today’s freshest outdoor air.',
        limitation: 'Outdoor air is still not perfectly clean; avoid opening during traffic surges.',
        sourceNote: 'model data',
      });
    }
  } else {
    actions.push({
      id: 'action-vent-default',
      action: 'Keep windows closed during early morning and late night inversions',
      when: 'Early morning & late evening',
      why: 'Cold winter air traps surface vehicle emissions close to the ground.',
      who: 'Whole household',
      effort: 'Low',
      costBand: 'Free',
      directImpact: 'Limits outdoor smoke ingress into sleeping areas.',
      limitation: 'Does not reduce CO2 buildup without intermittent afternoon flushes.',
      sourceNote: 'public-health rule',
    });
  }

  // Action 2: Commute / Outdoor exposure shield tailored to profile
  if (isCommutingOutdoor && isPoorOrWorse) {
    actions.push({
      id: 'action-commute-n95',
      action: 'Wear a well-fitted particulate respirator (N95/FFP2) and cover eyes',
      when: 'Morning & evening commute',
      why: `You travel by ${profile.lifestyle.commuteMode.replace('_', ' ')} for ${profile.lifestyle.oneWayKm} km during elevated pollution.`,
      who: 'Commuters and outdoor transit travelers',
      effort: 'Low',
      costBand: 'Under ₹1,500',
      directImpact: 'Filters up to 95% of fine particles (PM2.5) before they reach airways when sealed properly.',
      limitation: 'Does not filter gaseous pollutants (NO2, SO2, CO) and requires a snug facial seal without beard gaps.',
      sourceNote: 'household profile',
    });
  } else if (hasChildren && isPoorOrWorse) {
    actions.push({
      id: 'action-child-outdoor',
      action: 'Shift children’s vigorous physical play indoors today',
      when: 'After-school hours',
      why: 'Children breathe faster per kilogram of body weight, increasing lung exposure during smog hours.',
      who: `${profile.household.children} child(ren) in household`,
      effort: 'Medium',
      costBand: 'Free',
      directImpact: 'Reduces respiratory particulate volume intake during afternoon recreation.',
      limitation: 'Requires indoor space and quiet engaging activities.',
      sourceNote: 'household profile',
    });
  } else if (profile.lifestyle.outdoorExerciseTiming !== 'none' && isPoorOrWorse) {
    actions.push({
      id: 'action-exercise-shift',
      action: 'Replace outdoor exercise with indoor stretching, yoga, or bodyweight workouts',
      when: 'Usual workout time',
      why: 'Heavy breathing during outdoor exertion multiplies particulate inhalation up to 4x.',
      who: 'Exercising adults',
      effort: 'Medium',
      costBand: 'Free',
      directImpact: 'Avoids deep alveolar deposition of toxic combustion soot.',
      limitation: 'Does not replace aerobic endurance training.',
      sourceNote: 'public-health rule',
    });
  } else {
    actions.push({
      id: 'action-mask-errands',
      action: 'Bundle outdoor errands into midday and wear an N95 respirator',
      when: 'Midday hours',
      why: 'Sunlight and thermal mixing usually lift ground-level particulate concentrations midday.',
      who: 'Adults running errands',
      effort: 'Low',
      costBand: 'Under ₹1,500',
      directImpact: 'Minimizes trip frequency and filters fine particulates during unavoidable outdoor trips.',
      limitation: 'Cloth masks or surgical masks do not filter sub-micron particles effectively.',
      sourceNote: 'public-health rule',
    });
  }

  // Action 3: Indoor source control based on habits (coils/incense, cooking, or room cleaning)
  if (profile.lifestyle.incenseOrMosquitoCoil) {
    actions.push({
      id: 'action-stop-coil',
      action: 'Substitute burning mosquito coils or incense with physical screens or liquid vaporizers',
      when: 'Immediately / all day',
      why: 'Burning one mosquito coil emits particulate matter equivalent to 75–100 cigarettes inside an unventilated room.',
      who: 'All household members',
      effort: 'Low',
      costBand: 'Under ₹1,500',
      directImpact: 'Eliminates one of the highest internal sources of indoor PM2.5 and aromatic hydrocarbons.',
      limitation: 'Requires installing window mesh or using approved electric repellents.',
      sourceNote: 'household profile',
    });
  } else if (profile.lifestyle.cookingFuel === 'biomass_chulha') {
    actions.push({
      id: 'action-chulha-vent',
      action: 'Cook near open exterior doors or switch to induction burner for quick meals',
      when: 'Meal prep times',
      why: 'Solid biomass combustion produces hazardous carbon monoxide and ultra-fine carbon black.',
      who: 'Cook and children near kitchen',
      effort: 'Medium',
      costBand: profile.lifestyle.budgetBand === 'free' ? 'Free' : '₹1,500–₹12,000',
      directImpact: 'Drastically lowers direct kitchen exposure to deadly CO and PM2.5 spikes.',
      limitation: 'Requires reliable electric connection for induction appliances.',
      sourceNote: 'household profile',
    });
  } else {
    actions.push({
      id: 'action-wet-mop',
      action: 'Switch from dry broom sweeping to wet mopping with plain water',
      when: 'Morning cleaning routine',
      why: 'Dry broom sweeping aerosolizes settled fine dust back into the breathing zone for hours.',
      who: 'Entire home, especially crawling toddlers and sensitive individuals',
      effort: 'Low',
      costBand: 'Free',
      directImpact: 'Captures floor dust and soot without re-suspending it into room air.',
      limitation: 'Takes slightly longer to dry than a fast broom sweep.',
      sourceNote: 'public-health rule',
    });
  }

  return actions.slice(0, 3);
}

/**
 * Generates the full day low-emission routine across 6 diurnal day parts.
 */
export function generateFullDayRoutine(
  aqiResult: AqiResult | null,
  cleanestWindow: Window2Hour | null,
  dirtiestWindow: Window2Hour | null,
  profile: UserProfile
): DayPartRoutine[] {
  const aqi = aqiResult?.aqi ?? 240;
  const isSevere = aqi > 350;
  const hasChildren = profile.household.children > 0;
  const hasOlderAdults = profile.household.olderAdults > 0;
  const isVulnerable = profile.household.hasVulnerability || hasChildren || hasOlderAdults;

  const routines: DayPartRoutine[] = [
    {
      part: 'Early Morning',
      timeRange: '05:30 AM – 08:30 AM',
      airQualityContext: dirtiestWindow
        ? `Severe winter temperature inversion traps exhaust near the ground. Diurnal smog peak around ${dirtiestWindow.label}.`
        : isSevere
        ? 'Severe winter temperature inversion traps exhaust near the ground. Worst air period.'
        : 'Cool overnight air holds particulate concentrations close to breathing level.',
      actions: [
        {
          id: 'routine-morning-vent',
          action: 'Keep all balcony doors and windows firmly shut; do not open for fresh morning breeze',
          when: 'Early morning',
          why: 'Early morning air in winter is saturated with trapped nocturnal emissions and boundary inversion.',
          who: 'All household members',
          effort: 'Low',
          costBand: 'Free',
          directImpact: 'Prevents morning smog intrusion into bedrooms.',
          limitation: 'Does not clean stale indoor air without mechanical circulation.',
          sourceNote: 'public-health rule',
        },
        {
          id: 'routine-morning-exercise',
          action:
            profile.lifestyle.outdoorExerciseTiming === 'early_morning'
              ? 'Cancel outdoor morning walk/jog; do 20 minutes of indoor stretching or yoga'
              : 'Keep morning routines strictly indoors',
          when: '06:00 AM – 07:30 AM',
          why: 'Aerobic outdoor exercise during morning inversion forces particulate matter deep into lung alveoli.',
          who: hasOlderAdults ? 'Older adults and active adults' : 'Exercising members',
          effort: 'Medium',
          costBand: 'Free',
          directImpact: 'Reduces inhaled particle volume by 60–80% compared to brisk outdoor walking.',
          limitation: 'Indoor air must also be kept clean of cooking and smoke.',
          sourceNote: 'household profile',
        },
      ],
      cautionForVulnerable: hasOlderAdults || profile.household.hasVulnerability
        ? 'Vulnerable individuals should avoid going outdoors for morning newspaper pickup or garden strolls until after 10 AM.'
        : null,
    },
    {
      part: 'School or Work Trip',
      timeRange: '08:30 AM – 10:30 AM',
      airQualityContext:
        'Heavy vehicular rush hour. High localized concentrations of nitrogen dioxide (NO2) and carbon monoxide (CO) along main roads.',
      actions: [
        {
          id: 'routine-trip-mask',
          action:
            profile.lifestyle.commuteMode === 'car'
              ? 'Keep car windows closed and activate AC recirculation mode (internal air circulation)'
              : 'Wear a snugly fitted N95 respirator mask throughout the commute',
          when: 'During travel',
          why:
            profile.lifestyle.commuteMode === 'car'
              ? 'External AC intake pulls exhaust fumes directly from vehicle tailpipes ahead.'
              : 'Traffic corridors concentrate ultra-fine road dust and diesel exhaust.',
          who: 'Commuters and traveling children',
          effort: 'Low',
          costBand: profile.lifestyle.commuteMode === 'car' ? 'Free' : 'Under ₹1,500',
          directImpact:
            profile.lifestyle.commuteMode === 'car'
              ? 'Cuts in-cabin PM2.5 levels by 40–70% within 10 minutes.'
              : 'Blocks up to 95% of fine particulates during road exposure.',
          limitation: 'Recirculation in cars increases CO2 after 30 minutes; open cracked vent briefly away from traffic.',
          sourceNote: 'household profile',
        },
        {
          id: 'routine-trip-carpool',
          action: 'Pool rides or synchronize departure times with neighbors',
          when: 'Morning departure',
          why: 'Fewer cold engines idling on neighborhood internal lanes reduces localized doorstep pollution.',
          who: 'Neighborhood community & commuters',
          effort: 'Medium',
          costBand: 'Free',
          directImpact: 'Decreases household fuel expense and lane-level vehicular exhaust.',
          limitation: 'Requires schedule coordination among neighbors.',
          sourceNote: 'public-health rule',
        },
      ],
      cautionForVulnerable: hasChildren
        ? 'Ensure school-going children have a certified child-sized N95 mask while waiting at roadside bus stops.'
        : null,
    },
    {
      part: 'Midday',
      timeRange: '11:00 AM – 03:30 PM',
      airQualityContext:
        cleanestWindow
          ? `Thermal solar heating lifts the inversion layer. Today’s cleaner window is around ${cleanestWindow.label}.`
          : 'Afternoon sun generates thermal mixing, providing the safest window of the day.',
      actions: [
        {
          id: 'routine-midday-vent',
          action: cleanestWindow
            ? `Open windows for a quick 15-minute cross-ventilation during ${cleanestWindow.label}`
            : 'Crack open windows for 15 minutes to refresh stagnant indoor air',
          when: cleanestWindow ? cleanestWindow.label : '01:00 PM – 02:00 PM',
          why: 'This provides the lowest outdoor particulate concentration of the 24-hour cycle today.',
          who: 'Whole household',
          effort: 'Low',
          costBand: 'Free',
          directImpact: 'Lowers indoor carbon dioxide and stale moisture buildup without major particulate penalties.',
          limitation: 'Close windows promptly after 15–20 minutes before afternoon school traffic picks up.',
          sourceNote: 'model data',
        },
        {
          id: 'routine-midday-sun',
          action: 'Dry clothes in sunlit balconies or covered terraces instead of unventilated indoor rooms',
          when: 'Midday hours',
          why: 'Damp indoor laundry increases relative humidity, encouraging dust mite proliferation in closed rooms.',
          who: 'Household members',
          effort: 'Low',
          costBand: 'Free',
          directImpact: 'Maintains optimal indoor humidity (40–60%) without synthetic dehumidifiers.',
          limitation: 'Bring clothes in before evening smog settling begins.',
          sourceNote: 'public-health rule',
        },
      ],
      cautionForVulnerable: null,
    },
    {
      part: 'Cooking',
      timeRange: '12:00 PM & 07:00 PM – 08:30 PM',
      airQualityContext:
        'Indoor cooking with high-heat oil frying or solid fuel generates sudden indoor PM2.5 and VOC spikes reaching 300+ µg/m³ inside closed kitchens.',
      actions: [
        {
          id: 'routine-cook-exhaust',
          action: 'Always turn on the kitchen exhaust chimney or fan 1 minute BEFORE lighting the stove and keep on for 5 minutes after',
          when: 'Every cooking session',
          why: 'Exhaust fans take a minute to establish air current pathways out of the kitchen.',
          who: 'Family cook and nearby household members',
          effort: 'Low',
          costBand: 'Free',
          directImpact: 'Extracts cooking oil vapours, nitrogen oxides, and moisture before they diffuse into living areas.',
          limitation: 'Requires an outdoor-vented kitchen chimney or exhaust port.',
          sourceNote: 'public-health rule',
        },
        {
          id: 'routine-cook-lid',
          action: 'Use pan lids during tadka (tempering) and frying to trap oil droplets',
          when: 'During meal preparation',
          why: 'High-temperature oil splattering releases microscopic aerosolized fats and acrolein fumes.',
          who: 'Entire household, especially toddlers playing near kitchen',
          effort: 'Low',
          costBand: 'Free',
          directImpact: 'Reduces kitchen PM2.5 spikes by up to 50% during spice roasting.',
          limitation: 'Requires mindful culinary habits.',
          sourceNote: 'public-health rule',
        },
      ],
      cautionForVulnerable: isVulnerable
        ? 'Keep children, elderly members, and sensitive individuals in a separate closed room while tempering spices.'
        : null,
    },
    {
      part: 'Evening Outdoors',
      timeRange: '05:30 PM – 08:30 PM',
      airQualityContext:
        'Evening boundary layer collapses rapidly as sun sets. Traffic and biomass burning trigger a sharp second smog spike.',
      actions: [
        {
          id: 'routine-evening-shield',
          action: 'Keep home doors and windows closed before sunset (by 05:00 PM)',
          when: 'Before 05:00 PM',
          why: 'Falling ground temperatures trap evening peak vehicle exhaust rapidly.',
          who: 'All household members',
          effort: 'Low',
          costBand: 'Free',
          directImpact: 'Locks out the evening smog spike before it penetrates deep into living quarters.',
          limitation: 'Requires remembering to seal doors prior to evening rush.',
          sourceNote: 'model data',
        },
        {
          id: 'routine-evening-play',
          action: hasChildren
            ? 'Transition children to indoor board games, reading, or arts rather than outdoor park play'
            : 'Avoid outdoor running or extended market strolls after dusk',
          when: '05:30 PM – 07:30 PM',
          why: 'Evening hours represent high ambient particulate concentration and heavy localized exhaust.',
          who: hasChildren ? 'Children & parents' : 'Adults',
          effort: 'Medium',
          costBand: 'Free',
          directImpact: 'Cuts daily inhaled particulate exposure by up to 40% compared to outdoor play.',
          limitation: 'Children require stimulating indoor alternatives to burn evening energy.',
          sourceNote: 'household profile',
        },
      ],
      cautionForVulnerable: isVulnerable
        ? 'Individuals with asthma or heart conditions should strictly avoid evening outdoor strolls.'
        : null,
    },
    {
      part: 'Night',
      timeRange: '09:00 PM – 06:00 AM',
      airQualityContext:
        'Prolonged 8-hour breathing period in a single closed room. CO2 and particulate accumulation depends on bedroom door and filter setup.',
      actions: [
        {
          id: 'routine-night-clean',
          action: profile.lifestyle.hasPurifier
            ? 'Run bedroom air purifier on medium/sleep mode continuously through the night'
            : 'Damp-wipe bedroom headboards and window sills before sleeping; keep bedroom door slightly ajar if multiple occupants',
          when: 'Bedtime',
          why: 'We inhale over 3,000 liters of air while sleeping; clean bedroom air allows airways to recover.',
          who: 'All sleeping occupants',
          effort: 'Low',
          costBand: profile.lifestyle.hasPurifier ? 'Free' : 'Free',
          directImpact: profile.lifestyle.hasPurifier
            ? 'Maintains bedroom PM2.5 under 25 µg/m³ throughout 8 hours of sleep.'
            : 'Prevents dust resettlement while allowing CO2 ventilation.',
          limitation: profile.lifestyle.hasPurifier
            ? 'Consumes ~25–45 Watts of electricity overnight.'
            : 'Does not filter ambient outdoor smoke seepage.',
          sourceNote: 'household profile',
        },
        {
          id: 'routine-night-seal',
          action: 'Use rolled towel or door draft stopper at the bottom of the main entry door',
          when: 'Before sleeping',
          why: 'Corridors and stairwells in apartment buildings channel outdoor and neighbor smoke into entryways.',
          who: 'Entire home',
          effort: 'Low',
          costBand: 'Free',
          directImpact: 'Blocks cold smoke currents from common apartment corridors.',
          limitation: 'Temporary seal that must be repositioned when entering or leaving.',
          sourceNote: 'public-health rule',
        },
      ],
      cautionForVulnerable: isVulnerable
        ? 'Ensure bedside drinking water is available; dry winter smog air irritates throats during mouth breathing.'
        : null,
    },
  ];

  return routines;
}

/**
 * Generates sustainable alternatives across Transport, Household habits, and Community action.
 */
export function generateSwaps(profile: UserProfile): SwapItem[] {
  const transportCalc = calculateTransportEmissions(
    profile.lifestyle.commuteMode,
    profile.lifestyle.oneWayKm,
    profile.lifestyle.commuteDaysPerWeek,
    profile.lifestyle.carpoolOccupancy
  );

  const swaps: SwapItem[] = [
    // Transport Swaps
    {
      id: 'swap-transport-commute',
      category: 'Transport',
      currentHabit:
        profile.lifestyle.commuteMode === 'car'
          ? `Solo car commute (${profile.lifestyle.oneWayKm} km one-way, ${profile.lifestyle.commuteDaysPerWeek} days/week)`
          : profile.lifestyle.commuteMode === 'two_wheeler'
          ? `Solo two-wheeler commute (${profile.lifestyle.oneWayKm} km one-way)`
          : `Current ${profile.lifestyle.commuteMode.replace('_', ' ')} commute`,
      alternative:
        profile.lifestyle.commuteMode === 'car'
          ? 'Switch to Metro or 3-Person Carpool for 3 days per week'
          : profile.lifestyle.commuteMode === 'two_wheeler'
          ? 'Switch to Metro or Electric Bus with N95 mask for primary trips'
          : 'Consolidate commute and telecommute 1 additional day per week',
      effort: 'Medium',
      roughCostRupees:
        profile.lifestyle.commuteMode === 'car'
          ? 'Saves ₹3,000–₹6,000/month on petrol & parking'
          : 'Saves ₹800–₹1,500/month on fuel',
      whatImproves:
        'Drastically reduces personal vehicle tailpipe emissions and cuts personal driving fatigue in bumper-to-bumper traffic.',
      whatItDoesNotChange:
        'Does not change the overall citywide AQI reading or ambient industrial haze on its own.',
      transportImpact: {
        weeklyKgCo2e: transportCalc.weeklyKgCo2e,
        monthlyKgCo2e: transportCalc.monthlyKgCo2e,
        annualKgCo2e: transportCalc.annualKgCo2e,
        annualRangeKgCo2e: transportCalc.annualRangeKgCo2e,
        factorVersion: transportCalc.factorVersion,
        assumption: transportCalc.assumption,
      },
    },
    // Household Habit Swaps
    {
      id: 'swap-household-mosquito',
      category: 'Household Habits',
      currentHabit: profile.lifestyle.incenseOrMosquitoCoil
        ? 'Burning mosquito coils or dhoop/agarbatti inside rooms'
        : 'Using chemical aerosol bug sprays in closed rooms',
      alternative:
        'Install magnetic Velcro window nets on ventilation windows + use electric vaporizers or ultrasonic traps',
      effort: 'Low',
      roughCostRupees: '₹400–₹1,200 one-time for DIY window mesh',
      whatImproves:
        'Completely removes severe indoor combustion source that emits volatile aromatic hydrocarbons and particulate matter equivalent to tens of cigarettes.',
      whatItDoesNotChange:
        'Does not prevent fine outdoor smog from entering through unsealed window gaps.',
    },
    {
      id: 'swap-household-cleaning',
      category: 'Household Habits',
      currentHabit: 'Daily dry broom sweeping with traditional jharoo',
      alternative:
        'Microfiber damp mopping with plain water, rinsing mop frequently in a bucket',
      effort: 'Low',
      roughCostRupees: '₹250–₹500 for a microfiber flat mop',
      whatImproves:
        'Captures microscopic soot, settled fine dust, and pollen directly into water instead of kicking it back up into indoor breathing heights.',
      whatItDoesNotChange:
        'Does not capture airborne aerosols already suspended above eye level.',
    },
    {
      id: 'swap-household-purifier',
      category: 'Household Habits',
      currentHabit: profile.lifestyle.hasPurifier
        ? 'Running purifier only when smog smells bad, or opening windows while purifier runs'
        : 'Keeping windows closed with no active particulate filtration',
      alternative: profile.lifestyle.hasPurifier
        ? 'Keep purifier on low/auto 24/7 in a sealed bedroom; check pre-filter monthly'
        : 'Build a DIY Box Fan filter (exhaust fan / pedestal fan + MERV 13 / HEPA sheet) or get an entry HEPA unit',
      effort: 'Medium',
      roughCostRupees: profile.lifestyle.hasPurifier
        ? '₹0 (existing device) + ~₹150/mo electricity'
        : '₹1,800–₹3,200 for DIY fan setup or ₹6,500+ for entry HEPA unit',
      whatImproves:
        'Creates an indoor clean-air haven where family airways can rest and recover from daytime urban exposure.',
      whatItDoesNotChange:
        'Does not remove carbon monoxide or reduce indoor carbon dioxide without timed fresh air exchanges.',
    },
    // Community Action Swaps
    {
      id: 'swap-community-waste',
      category: 'Community Action',
      currentHabit: 'Watching neighbors or lane sweepers burn leaves and plastic trash in winter',
      alternative:
        'Create a colony leaf compost pit + provide lane guards with electric room heaters instead of open scrap bonfires',
      effort: 'High',
      roughCostRupees: '₹1,500 shared across colony RWA for a community heater & compost wire bin',
      whatImproves:
        'Stops the most toxic localized dioxin and dense black-carbon smoke right outside your doorstep and windows.',
      whatItDoesNotChange:
        'Does not prevent distant agricultural crop residue or regional industrial smoke from traveling over the city.',
    },
    {
      id: 'swap-community-schoolrun',
      category: 'Community Action',
      currentHabit: 'Every family driving their individual car or scooter to the same school gate',
      alternative:
        'Organize a 4-family school carpool rotation or pool for a neighborhood electric school van',
      effort: 'Medium',
      roughCostRupees: 'Saves ₹1,200–₹2,500 per family per month in fuel',
      whatImproves:
        'Relieves massive school-gate idling congestion, cutting toxic ground-level exhaust where children board and deboard.',
      whatItDoesNotChange:
        'Does not change school sports ground air during regional high-AQI days.',
    },
  ];

  return swaps;
}
