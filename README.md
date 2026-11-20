# HawaSaathi 🇮🇳
**GenAI-Powered Urban Air Quality Assistant for Indian Families & Communities**

HawaSaathi is a complete, deployable web application designed for families and communities in Indian cities (such as Delhi, Lucknow, Kolkata, Patna, Kanpur, Mumbai, and beyond) dealing with severe winter smog and chronic urban air pollution.

People open HawaSaathi to decide what to do **today**: a low-emission daily routine, indoor air-quality hacks, and sustainable alternatives fitted to their city and household, accompanied by plain-language explanations of the direct impact of each choice.

A parent finishes a 3-step onboarding (or skips straight to defaults) and immediately sees an operational action plan. No user account, no paywalls, and no empty marketing pages.

---

## Table of Contents
1. [Problem Statement Alignment](#problem-statement-alignment)
2. [Key Features & Screens](#key-features--screens)
3. [CPCB AQI & Impact Methodology](#cpcb-aqi--impact-methodology)
4. [Language, Communication & Safety Limits](#language-communication--safety-limits)
5. [GenAI Architecture & Fallback System](#genai-architecture--fallback-system)
6. [Getting Started & Local Development](#getting-started--local-development)
7. [Testing](#testing)
8. [Environment Variables](#environment-variables)
9. [Deployment to Vercel](#deployment-to-vercel)

---

## Problem Statement Alignment

This section explicitly maps the requirements to the screens and modules in HawaSaathi:

| Requirement / Sentence | Implementation & Screen Location |
| :--- | :--- |
| **Low-emission daily routines** | **Screen 3: Routine (`RoutineView.tsx`)**: Diurnal breakdown across 6 day parts (Early Morning, School/Work Trip, Midday, Cooking, Evening Outdoors, Night). Dynamically adjusts ventilation timing, school drop-offs, cooking exhaust, and exercise based on real-time hourly forecast inversions. |
| **Indoor air hacks** | **Screen 4: Indoors (`IndoorsView.tsx`)**: Evidence-based indoor interventions structured strictly by **source control first** (eliminating incense, dhoop, and mosquito coils; wet mopping over dry sweeping; kitchen chimney pre-run), **timed ventilation second** (opening windows only during cleaner solar mixing windows), and **filtration third** (interactive room CADR sizing helper for 5 or 6 ACH). |
| **Sustainable alternatives** | **Screen 5: Swaps (`SwapsView.tsx`)**: Actionable swaps across Transport (carpool, metro, cycling, telecommuting), Household Habits (magnetic window mesh, damp microfiber mopping, DIY Box-Fan filters), and Community Action (colony leaf composting, electric heaters for security guards, pooled school runs). |
| **Tailored to location and lifestyle** | **Onboarding & Screen 7: Household (`HouseholdView.tsx`, `OnboardingModal.tsx`)**: Location resolution biased to India with coordinate rounding (~1 km), household composition (counts of adults, children, older adults; outdoor worker flag; sensitivity preference flag), and commute/cooking lifestyle profiles. |
| **Direct impact of each choice** | **Top 3 Actions (`ActionCard.tsx`) & Transport Model (`impact.ts`)**: Every recommendation item states what to do, when, who benefits, effort, cost band, direct impact on personal exposure or tailpipe emissions, limitations, and source notes. Transport impacts display weekly, monthly, and annual CO2e with a ±20% planning range. |
| **GenAI explanation** | **Screen 6: Ask HawaSaathi (`AskView.tsx`, `/api/explain`)**: Conversational explainer powered by `@google/genai` (default `gemini-2.5-flash`), answering "why this advice, for my home, today?" based strictly on the JSON context with deterministic guided fallbacks when unconfigured. |

---

## Key Features & Screens

HawaSaathi is designed as a calm, accessible household guide usable on screens from 320px width up to desktop:

1. **Today**: City name, estimated CPCB-style AQI, air category, dominant pollutant, ambient weather (temperature, humidity, wind speed), cleanest and dirtiest 2-hour forecast blocks, and the top 3 high-priority actions for the household.
2. **Air Now**: Detailed concentrations and sub-indices for PM2.5, PM10, NO2, SO2, O3, and CO. Interactive 24-hour forecast trends paired with an accessible data table of the exact numerical readings.
3. **Routine**: A full 6-phase diurnal low-emission day adapting to the hourly curve and household vulnerabilities (e.g. shielding school-age children during evening rush, moving senior walks indoors during morning temperature inversions).
4. **Indoors**: Ordered interventions (Source control → Timed ventilation → Filtration). Includes an interactive room CADR sizing helper (length × width × height in meters or feet) recommending fan-filter throughput at 5 or 6 ACH.
5. **Swaps**: Alternatives for transport, home habits, and neighborhood action. Displays current habit, alternative, effort, rough rupee cost, what improves, and what it does not change.
6. **Ask HawaSaathi**: Conversational explainer with tappable question chips and freeform input (capped at 500 characters). Automatically falls back to a deterministic guided explanation if offline or without an API key.
7. **Household**: Edit location, composition, and habits; inspect raw local storage JSON; reset to baseline; or wipe all browser data completely.

---

## CPCB AQI & Impact Methodology

### Estimated CPCB-Style AQI
- **Hourly Calculation**: Uses standard Indian Central Pollution Control Board (CPCB) linear interpolation sub-index formulas:
  $$I = I_{\text{low}} + \frac{I_{\text{high}} - I_{\text{low}}}{C_{\text{high}} - C_{\text{low}}} \times (C - C_{\text{low}})$$
- **3-Pollutant Rule**: Overall AQI is the maximum valid sub-index, and is **only computed when at least three pollutants are present and at least one of them is PM2.5 or PM10**. If this threshold is not met, AQI is classified as *Indeterminate*.
- **Carbon Monoxide Unit Conversion**: Open-Meteo returns CO in $\mu\text{g/m}^3$. HawaSaathi divides Open-Meteo CO readings by 1000 to convert to $\text{mg/m}^3$ before evaluating against CPCB breakpoint bands ($0\text{–}1.0 \rightarrow 0\text{–}50$, $1.1\text{–}2.0 \rightarrow 51\text{–}100$, etc.).
- **Above-Scale Cap**: Concentrations exceeding the top band are capped at 500 and explicitly flagged as *above scale*.
- **Regulatory Transparency**: Always labeled *"Estimated CPCB-style AQI from hourly model data"*, never *"official CPCB AQI"* or *"government reading"*. The app explicitly clarifies that official CPCB AQI utilizes 24-hour averages for particulates and 8-hour averages for CO and ozone.

### Deterministic Impact Math (`hawasaathi-planning-2026.1`)
- **Transport Emissions**:
  $$\text{Annual CO}_2\text{e (kg)} = \text{one-way km} \times 2 \times \text{days per week} \times 52 \times \text{emission factor}$$
  - Baseline: Solo car ($0.170\text{ kg CO}_2\text{e/p-km}$)
  - Carpool: Solo car factor divided by occupancy ($0.170 / N$)
  - Two-Wheeler: $0.045\text{ kg CO}_2\text{e/p-km}$
  - Metro/Bus Transit: $0.028\text{ kg CO}_2\text{e/p-km}$
  - Cycle / Walk / WFH: $0.000\text{ kg CO}_2\text{e/p-km}$ (near-zero tailpipe; no false sub-gram claims)
  - Uncertainty: Reported with a deterministic $\pm 20\%$ planning range along with weekly and monthly savings.
- **Outdoor Exposure Proxy**:
  $$\text{Concentration-Time Proxy} = \text{PM}_{2.5} (\mu\text{g/m}^3) \times \text{hours outside} \quad (\mu\text{g}\cdot\text{h/m}^3)$$
  Explicitly designated as a *concentration-time proxy*, **not** an inhaled dose or medical risk score.
- **Room CADR Sizing Hint**:
  $$\text{CADR Hint (m}^3\text{/h)} = \text{Room Volume (m}^3) \times \text{Target ACH}$$
  Target ACH is 5 air changes per hour, or 6 if a vulnerability preference flag is active. Explicitly designated as a *sizing hint, not a predicted indoor concentration*.

---

## Language, Communication & Safety Limits

HawaSaathi enforces strict safety boundaries across UI text and AI generation:
1. **Family-Centered Tone**: Written in short, clear sentences. Avoids clinical or medical diagnostic jargon.
2. **Non-Medical Terms**: Uses phrases like *"more vulnerable people"* and *"public-health guidance"*; never diagnoses, prescribes, or promises treatment.
3. **No Ineffective or Harmful Hacks**:
   - Never recommends ozone generators or ionizing devices sold as air cleaners.
   - Refuses claims that houseplants can filter or clean an ambient winter smog episode.
   - Prohibits unventilated chemical or disinfectant spraying.
4. **Evidence-Based Ventilation**: Never advises opening windows simply because it is morning. Morning winter inversions trap toxic exhaust at surface levels. Windows are opened only during verified cleaner forecast windows (typically midday thermal mixing).
5. **No False Promises of Cleaning the City**: Clearly states that one household's actions do not alter the city's ambient AQI. Impact lines describe personal exposure avoidance and household emission reductions.

---

## GenAI Architecture & Fallback System

- **Serverless Backend**: The official `@google/genai` SDK is used exclusively inside serverless functions (`/api/explain.ts` and `/api/health.ts`). The API key is never exposed to client browsers.
- **Input Sanitization**: User prompt is capped at 500 characters and wrapped inside an untrusted data boundary.
- **Rate Limiting**: Built-in in-memory rate limiter caps requests at 20 queries per minute per client.
- **Deterministic Guided Fallback**: If `GEMINI_API_KEY` is not provided, or if the API times out (after 8s) or fails, HawaSaathi automatically responds with a high-quality deterministic guided explanation built from public-health guidance and current forecast data, labeled *"Guided explanation"* rather than *"AI"*. The app is 100% functional with zero API keys.

---

## Getting Started & Local Development

### Prerequisites
- Node.js 18+ (tested on Node.js v22.14 LTS)
- npm or pnpm

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/hawasaathi.git
cd hawasaathi

# Install dependencies
npm install
```

### Running Locally
```bash
# Start local development server (with built-in /api dev middleware)
npm run dev
```
Open `http://localhost:5173` in your browser.

### Type Checking & Building
```bash
# Run TypeScript strict typecheck
npm run typecheck

# Run production build
npm run build
```

---

## Testing

Vitest is configured with `@testing-library/react` and `jsdom`. Tests verify mathematical purity, public-health safety text, schema validation, and regulatory labeling:

```bash
# Run test suite
npm test
```

### Test Coverage Highlights (30 Tests Across 6 Suites):
- **CPCB AQI**: Sub-index linear interpolation across all bands, above-scale cap at 500, CO $\mu\text{g/m}^3 \rightarrow \text{mg/m}^3$ conversion (/1000), 3-pollutant rule, and missing data handling.
- **Deterministic Impact**: Transport formula ($N$-person carpool, baseline solo car, weekly/monthly breakdown, $\pm 20\%$ planning range), zero tailpipe classification, exposure proxy wording, and room CADR sizing hint.
- **Diurnal Planner**: Cleanest and dirtiest 2-hour window selection from moving averages; dynamic routine adjustments when children, seniors, or smoke habits are present.
- **Local Storage & Privacy**: Coordinate rounding to ~1 km resolution, Zod schema validation, corrupt data fallback, and full reset.
- **API & GenAI Safety**: Rejection of prompts $>500$ chars, rate limiting, and deterministic guided explanation fallback when Gemini is unconfigured.
- **Regulatory Render Test**: Verifies `AirNowView` explicitly says *"Estimated"* and does **not** label model results as *"official CPCB AQI"*.

---

## Environment Variables

Copy `.env.example` to `.env` if you wish to enable Google Gemini AI:
```bash
cp .env.example .env
```

| Variable | Required | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for live AI explanations. If omitted, HawaSaathi uses deterministic guided explanations. |
| `GEMINI_MODEL` | Optional | Gemini model ID. Defaults to `gemini-2.5-flash`. |

---

## Deployment to Vercel

HawaSaathi is ready for 1-click deployment on [Vercel](https://vercel.com):

1. **Connect Repository**: Import the `hawasaathi` repository in your Vercel dashboard.
2. **Framework Preset**: Select **Vite**.
3. **Environment Variables**: Add `GEMINI_API_KEY` (optional) and `GEMINI_MODEL` (`gemini-2.5-flash`).
4. **Deployment Protection**: **Ensure Vercel Deployment Protection is turned OFF** (Settings → Deployment Protection → Disabled) so judges and evaluators can access the public preview URL without authentication.
5. **Security & Headers**: `vercel.json` automatically configures SPA routing rewrites, Content Security Policy (`CSP`), and permissions policy (only `geolocation` allowed).

---

## License & Attribution
- Air Quality and Weather data powered by [Open-Meteo](https://open-meteo.com) (Copernicus CAMS & ECMWF).
- CPCB AQI Breakpoints sourced from Central Pollution Control Board, Ministry of Environment, Forest and Climate Change, Government of India.
- Released under the MIT License.
