import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AirNowView } from '../views/AirNowView';
import { AirDataState } from '../types/air';

describe('AirNowView Render & Regulatory Labeling Test', () => {
  const mockAirState: AirDataState = {
    current: {
      aqi: 310,
      category: 'Very Poor',
      categoryDescription: 'Respiratory illness on prolonged exposure.',
      dominantPollutant: 'PM2.5',
      dominantPollutantKey: 'pm2_5',
      isAboveScale: false,
      pollutants: {
        pm2_5: {
          key: 'pm2_5',
          name: 'PM2.5',
          value: 135.4,
          unit: 'µg/m³',
          subIndex: 310,
          isAboveScale: false,
          isMissing: false,
        },
        pm10: {
          key: 'pm10',
          name: 'PM10',
          value: 260.1,
          unit: 'µg/m³',
          subIndex: 210,
          isAboveScale: false,
          isMissing: false,
        },
        nitrogen_dioxide: {
          key: 'nitrogen_dioxide',
          name: 'NO2',
          value: 55.2,
          unit: 'µg/m³',
          subIndex: 69,
          isAboveScale: false,
          isMissing: false,
        },
        sulphur_dioxide: {
          key: 'sulphur_dioxide',
          name: 'SO2',
          value: 22.0,
          unit: 'µg/m³',
          subIndex: 28,
          isAboveScale: false,
          isMissing: false,
        },
        ozone: {
          key: 'ozone',
          name: 'O3',
          value: 45.0,
          unit: 'µg/m³',
          subIndex: 45,
          isAboveScale: false,
          isMissing: false,
        },
        carbon_monoxide: {
          key: 'carbon_monoxide',
          name: 'CO',
          value: 1.8,
          unit: 'mg/m³',
          subIndex: 90,
          isAboveScale: false,
          isMissing: false,
        },
      },
      validPollutantCount: 6,
      hasParticulate: true,
      meetsCalculationCriteria: true,
      calculationNote: 'Estimated CPCB-style AQI from hourly model data.',
    },
    currentHourly: null,
    hourly24h: [
      {
        time: '2026-11-21T12:00:00Z',
        displayTime: '12:00',
        hour: 12,
        pm2_5: 135.4,
        pm10: 260.1,
        nitrogen_dioxide: 55.2,
        sulphur_dioxide: 22.0,
        ozone: 45.0,
        carbon_monoxide: 1.8,
        rawCoUgM3: 1800,
        aqi: 310,
        category: 'Very Poor',
        temp: 24,
        humidity: 45,
        windSpeed: 10,
      },
    ],
    cleanestWindow: null,
    dirtiestWindow: null,
    weather: { temp: 24, humidity: 45, windSpeed: 10 },
    dataTimestamp: '2026-11-21T12:00:00Z',
    timezone: 'Asia/Kolkata',
    provider: 'Open-Meteo',
    lastSuccessTime: '2026-11-21T12:00:00Z',
    error: null,
    loading: false,
  };

  it('renders the Air screen with "Estimated" and does NOT label the live result as "official CPCB AQI"', () => {
    render(
      <AirNowView airState={mockAirState} cityName="Delhi" />
    );

    // 1. Must state "Estimated CPCB-style AQI from hourly model data"
    const estimatedElements = screen.getAllByText(
      /Estimated CPCB-style AQI from hourly model data/i
    );
    expect(estimatedElements.length).toBeGreaterThanOrEqual(1);
    expect(estimatedElements[0]).toBeInTheDocument();

    // 2. The heading/title must NOT present itself as "official CPCB AQI" or "government reading"
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).not.toContain('official CPCB AQI');
    expect(heading.textContent).not.toContain('government reading');

    // 3. Confirm the explanation sentence distinguishing 24h official averages is present
    expect(
      screen.getByText(/Official CPCB AQI uses 24-hour averages for particles/i)
    ).toBeInTheDocument();

    // 4. Verify pollutant values are rendered in both card and paired data table
    const pm25Elements = screen.getAllByText('135.4');
    expect(pm25Elements.length).toBeGreaterThanOrEqual(1);

    const pm10Elements = screen.getAllByText('260.1');
    expect(pm10Elements.length).toBeGreaterThanOrEqual(1);
  });
});
