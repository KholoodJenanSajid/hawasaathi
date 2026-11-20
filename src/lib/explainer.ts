export interface ExplainContext {
  city: string;
  aqi: number | null;
  category: string;
  dominantPollutant: string | null;
  cleanerHours: string;
  dirtierHours: string;
  actions: Array<{
    action: string;
    when: string;
    who: string;
    directImpact: string;
  }>;
  householdSummary?: {
    hasChildren: boolean;
    hasOlderAdults: boolean;
    hasVulnerability: boolean;
    commuteMode: string;
  };
}

/**
 * High-quality deterministic guided explainer.
 * Used when GEMINI_API_KEY is not configured, or as an automatic fallback if the Gemini API
 * encounters network timeout, rate limiting, or schema mismatch.
 *
 * SAFETY RULES ENFORCED:
 * 1. Plain, friendly language for families.
 * 2. Uses "more vulnerable people" and "public-health guidance", never medical diagnosis.
 * 3. Never recommends ozone generators, medical ionizers, unventilated chemicals, or claiming houseplants clean smog.
 * 4. Windows are opened ONLY when forecast window is cleaner than keeping shut during severe peak.
 * 5. Explains personal exposure and household emissions, not city air becoming clean.
 */
export function generateGuidedExplanation(
  userPrompt: string,
  context: ExplainContext
): string {
  const q = (userPrompt || '').toLowerCase();
  const aqiNum = context.aqi ?? 'indeterminate';
  const dominant = context.dominantPollutant ?? 'fine particulate matter (PM2.5)';
  const cat = context.category || 'elevated';
  const cleaner = context.cleanerHours || 'midday afternoon';
  const dirtier = context.dirtierHours || 'early morning and late night';

  // Topic 1: Houseplants, ozone generators, ionizers
  if (
    q.includes('plant') ||
    q.includes('houseplant') ||
    q.includes('ozone') ||
    q.includes('ionizer') ||
    q.includes('device')
  ) {
    return (
      `Public-health guidance is unequivocal: while houseplants are lovely in a home, they cannot filter a heavy winter smog episode where millions of microscopic particles penetrate living spaces. Similarly, ozone generators and standalone ionizers should be strictly avoided in homes—ozone irritates lung tissue, and ionizers often produce reactive secondary oxidants. For real indoor relief in ${context.city}, rely on physical source control (no incense or coils), timely window seals during peak hours (${dirtier}), and mechanical HEPA particulate filtration with verified Clean Air Delivery Rate (CADR).`
    );
  }

  // Topic 2: Ventilation and why windows shouldn't just be opened in the morning
  if (
    q.includes('window') ||
    q.includes('ventilat') ||
    q.includes('fresh air') ||
    q.includes('morning')
  ) {
    return (
      `In ${context.city} today, air pollution is in the ${cat} category (Estimated CPCB-style AQI: ${aqiNum}, dominant pollutant: ${dominant}). During winter, cold air traps exhaust near the surface in an inversion layer, making ${dirtier} the most hazardous time. That is why public-health guidance recommends keeping windows firmly sealed in the early morning. If you need to refresh stale indoor air, limit cross-ventilation strictly to the cleaner forecast window around ${cleaner}, when solar heating lifts the smog inversion layer and ambient particulate density dips.`
    );
  }

  // Topic 3: Older adults, children, or vulnerable family members
  if (
    q.includes('child') ||
    q.includes('older') ||
    q.includes('senior') ||
    q.includes('parent') ||
    q.includes('asthma') ||
    q.includes('vulnerab') ||
    q.includes('health') ||
    q.includes('exercise')
  ) {
    return (
      `Public-health guidance advises special care for more vulnerable people, including children (whose lungs are still growing and who breathe more air per kilogram of body weight) and older adults. Today in ${context.city}, with an estimated AQI of ${aqiNum} (${cat}), outdoor morning exertion or brisk walks should be moved indoors to yoga, stretching, or indoor play. During peak traffic and smog hours (${dirtier}), vulnerable family members should remain indoors with doors draft-stopped and avoid exposure to kitchen smoke or burning coils.`
    );
  }

  // Topic 4: Cooking fuel, incense, mosquito coils
  if (
    q.includes('cook') ||
    q.includes('fuel') ||
    q.includes('incense') ||
    q.includes('coil') ||
    q.includes('agarbatti') ||
    q.includes('smoke')
  ) {
    return (
      `Indoor air is often 2 to 5 times dirtier than ambient air when internal sources burn inside a sealed room. Burning a single mosquito coil or stick of incense produces particulate pollution equivalent to tens of cigarettes and releases benzene and formaldehyde. For cooking, turning on kitchen exhaust fans prior to heating oil and covering frying pans with lids directly stops oily aerosols from dispersing into bedrooms. Swapping coils for window nets or electric vaporizers immediately protects your home's air.`
    );
  }

  // Topic 5: City air vs household impact
  if (
    q.includes('city') ||
    q.includes('government') ||
    q.includes('solve') ||
    q.includes('change')
  ) {
    return (
      `It is vital to be transparent: one household adopting cleaner habits will not visibly change the citywide AQI reading of ${context.city}. City air requires large-scale industrial transition, public transport electrification, and regional crop residue solutions. The impact of HawaSaathi’s recommendations is measured in your family's personal exposure (significantly fewer micro-grams of toxic soot inhaled into lungs) and your household’s carbon and tailpipe emissions, giving your loved ones an everyday shield.`
    );
  }

  // Default synthesis explaining today's recommendations
  const actionSummaries = context.actions
    .slice(0, 3)
    .map((a, i) => `${i + 1}. ${a.action} (${a.when}) — direct benefit: ${a.directImpact}`)
    .join('\n');

  return (
    `Here is why HawaSaathi designed this specific routine for your household in ${context.city} today:\n\n` +
    `1. Current Ambient Air: Today's estimated CPCB-style AQI is ${aqiNum} (${cat}), with ${dominant} driving the index. Because surface inversions trap exhaust early and late, the dirtier hours span ${dirtier}, while the cleanest forecast window occurs around ${cleaner}.\n\n` +
    `2. Your Priority Actions Today:\n${actionSummaries}\n\n` +
    `3. Safety & Reality Check: These steps are designed using public-health guidance to minimize your family’s direct personal exposure. While individual household steps do not magically clean the city's ambient atmosphere, shielding sleeping areas, timing window openings to ${cleaner}, and wearing an N95 on the road substantially lowers the particulate burden inside your home.`
  );
}
