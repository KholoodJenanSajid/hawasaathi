import React, { useState } from 'react';
import { AirDataState, PollutantKey } from '../types/air';
import { Chart24h } from '../components/Chart24h';

interface AirNowViewProps {
  airState: AirDataState;
  cityName: string;
}

export const AirNowView: React.FC<AirNowViewProps> = ({ airState, cityName }) => {
  const [selectedChartMetric, setSelectedChartMetric] = useState<'pm2_5' | 'aqi'>('pm2_5');

  const { current, hourly24h, dataTimestamp, timezone, provider, error, lastSuccessTime } = airState;

  const pollutantsList: PollutantKey[] = [
    'pm2_5',
    'pm10',
    'nitrogen_dioxide',
    'sulphur_dioxide',
    'ozone',
    'carbon_monoxide',
  ];

  return (
    <section aria-labelledby="air-now-heading">
      <div className="view-header">
        <h1 id="air-now-heading" className="view-title">
          Air Now in {cityName}
        </h1>
        <p className="view-subtitle">
          Estimated CPCB-style AQI from hourly model data and detailed multi-pollutant readings.
        </p>
      </div>

      {/* Mandatory Regulatory & Methodology Clarification Sentence */}
      <div
        className="alert-box alert-info"
        style={{ fontSize: '0.875rem', marginBottom: '16px' }}
      >
        <strong>Methodology Note:</strong> Official CPCB AQI uses 24-hour averages for particles and 8-hour averages for CO and ozone.
        All metrics shown here represent estimated CPCB-style AQI from hourly model data to guide immediate hourly household choices.
      </div>

      {/* Error state */}
      {error && (
        <div className="alert-box alert-error" role="alert">
          <strong>Connection Alert:</strong> {error}
          {lastSuccessTime && (
            <p style={{ marginTop: '4px', fontSize: '0.8125rem' }}>
              Last successful sync: {new Date(lastSuccessTime).toLocaleString()} ({timezone}).
            </p>
          )}
        </div>
      )}

      {/* Data Source & Timestamp Meta */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '0.8125rem',
          color: 'var(--text-muted)',
          marginBottom: '16px',
        }}
      >
        <span>
          <strong>Provider:</strong> {provider}
        </span>
        <span>
          <strong>Data Timestamp:</strong>{' '}
          {dataTimestamp ? new Date(dataTimestamp).toLocaleString() : 'Live'} ({timezone})
        </span>
      </div>

      {/* Current Pollutants Cards */}
      <h2 style={{ fontSize: '1.1875rem', fontWeight: 700, marginBottom: '12px' }}>
        Current Pollutant Concentrations & Sub-Indices
      </h2>

      <div className="grid-3" style={{ marginBottom: '24px' }}>
        {pollutantsList.map((key) => {
          const reading = current?.pollutants[key];
          const val = reading?.value;
          const sub = reading?.subIndex;
          const isAbove = reading?.isAboveScale;
          const isMissing = reading?.isMissing || val === null || val === undefined;

          return (
            <div
              key={key}
              className="card"
              style={{
                marginBottom: 0,
                padding: '16px',
                borderLeft:
                  sub !== null && sub !== undefined && sub > 300
                    ? '4px solid var(--rust-base)'
                    : '1px solid var(--border-light)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                  {reading?.name || key}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {reading?.unit}
                </span>
              </div>

              <div style={{ margin: '8px 0' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {!isMissing ? (key === 'carbon_monoxide' ? val?.toFixed(2) : val?.toFixed(1)) : 'Missing'}
                </span>
                {!isMissing && (
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                    {reading?.unit}
                  </span>
                )}
              </div>

              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                <span>Sub-index: </span>
                <strong>
                  {!isMissing && sub !== null ? sub : 'Unavailable'}
                </strong>
                {isAbove && (
                  <span style={{ color: 'var(--rust-text)', fontWeight: 700, marginLeft: '6px' }}>
                    (above scale, capped at 500)
                  </span>
                )}
              </div>

              {key === 'carbon_monoxide' && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Open-Meteo CO in µg/m³ divided by 1000 to convert to mg/m³ for CPCB bands.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 24-Hour Forecast View */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '1.1875rem', fontWeight: 700 }}>
          24-Hour Air Quality Forecast
        </h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className={`btn ${selectedChartMetric === 'pm2_5' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ minHeight: '32px', padding: '4px 10px', fontSize: '0.8125rem' }}
            onClick={() => setSelectedChartMetric('pm2_5')}
          >
            PM2.5 Trend
          </button>
          <button
            type="button"
            className={`btn ${selectedChartMetric === 'aqi' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ minHeight: '32px', padding: '4px 10px', fontSize: '0.8125rem' }}
            onClick={() => setSelectedChartMetric('aqi')}
          >
            Estimated AQI Trend
          </button>
        </div>
      </div>

      {/* Chart paired with accessible data table */}
      <Chart24h hourly={hourly24h} selectedPollutant={selectedChartMetric} />
    </section>
  );
};
