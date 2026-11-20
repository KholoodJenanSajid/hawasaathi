import React from 'react';
import { AirDataState } from '../types/air';
import { UserProfile } from '../types/profile';
import { generateTopThreeActions } from '../lib/planner';
import { ActionCard } from '../components/ActionCard';

interface TodayViewProps {
  airState: AirDataState;
  profile: UserProfile;
  onRefresh: () => void;
  onOpenSettings: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  airState,
  profile,
  onRefresh,
  onOpenSettings,
}) => {
  const { current, cleanestWindow, dirtiestWindow, weather, error, loading } = airState;

  const topActions = generateTopThreeActions(
    current,
    cleanestWindow,
    dirtiestWindow,
    profile
  );

  const aqiVal = current?.aqi ?? null;
  const category = current?.category ?? 'Indeterminate';
  const dominant = current?.dominantPollutant ?? 'PM2.5';

  const badgeClass =
    category === 'Severe' || category === 'Very Poor'
      ? 'badge-severe'
      : category === 'Poor' || category === 'Moderate'
      ? 'badge-poor'
      : category === 'Good' || category === 'Satisfactory'
      ? 'badge-good'
      : 'badge-neutral';

  const bannerClass =
    category === 'Severe' || category === 'Very Poor'
      ? 'aqi-severe'
      : category === 'Poor' || category === 'Moderate'
      ? 'aqi-poor'
      : category === 'Good' || category === 'Satisfactory'
      ? 'aqi-good'
      : '';

  return (
    <section aria-labelledby="today-heading">
      <div className="view-header">
        <h1 id="today-heading" className="view-title">
          Today in {profile.location.cityName}
        </h1>
        <p className="view-subtitle">
          Real-time hourly air forecast and your household's tailored low-exposure action plan.
        </p>
      </div>

      {/* Error state if fetch failed */}
      {error && (
        <div className="alert-box alert-error" role="alert">
          <strong>Air Data Alert:</strong> {error}
          {airState.lastSuccessTime && (
            <p style={{ marginTop: '4px', fontSize: '0.8125rem' }}>
              Showing last successfully received data from{' '}
              {new Date(airState.lastSuccessTime).toLocaleTimeString()}.
            </p>
          )}
        </div>
      )}

      {/* AQI & Weather Banner */}
      <div className={`aqi-summary-banner ${bannerClass}`} aria-live="polite">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Estimated CPCB-Style AQI (Hourly Model)
            </span>
            <div className="aqi-number-group">
              <span className="aqi-large-number">{aqiVal !== null ? aqiVal : '—'}</span>
              <span className={`aqi-category-badge ${badgeClass}`}>{category}</span>
              {current?.isAboveScale && (
                <span
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--rust-text)',
                    background: '#ffffff',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  Above Scale (Capped at 500)
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Primary pollutant driving the index: <strong>{dominant}</strong>.
            </p>
          </div>

          {/* Weather summary */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            {weather ? (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.75)',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  display: 'flex',
                  gap: '12px',
                }}
              >
                <span>🌡️ {weather.temp}°C</span>
                <span>💧 {weather.humidity}% Humidity</span>
                <span>💨 {weather.windSpeed} km/h Wind</span>
              </div>
            ) : null}

            <button
              type="button"
              className="btn btn-secondary"
              onClick={onRefresh}
              disabled={loading}
              style={{ minHeight: '36px', fontSize: '0.8125rem', padding: '6px 12px' }}
              aria-label="Refresh live air data"
            >
              {loading ? 'Refreshing...' : '🔄 Refresh Data'}
            </button>
          </div>
        </div>

        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          {current?.calculationNote || 'Estimated from Open-Meteo hourly model data.'}
        </p>
      </div>

      {/* Cleaner and Dirtier Hours */}
      <h2 style={{ fontSize: '1.1875rem', fontWeight: 700, marginBottom: '12px' }}>
        Today’s Air Timing Windows
      </h2>
      <div className="grid-2" style={{ marginBottom: '24px' }}>
        <div className="window-pill cleaner-window">
          <div className="window-pill-header">
            <span className="window-tag tag-cleaner">🌿 Cleaner Window</span>
            <span className="window-time">{cleanestWindow ? cleanestWindow.label : 'Midday (~1:00 PM)'}</span>
          </div>
          <p className="window-desc">
            {cleanestWindow
              ? cleanestWindow.reason
              : 'Thermal solar heating typically lifts inversion smog midday.'}
          </p>
        </div>

        <div className="window-pill dirtier-window">
          <div className="window-pill-header">
            <span className="window-tag tag-dirtier">⚠️ Dirtiest Smog Peak</span>
            <span className="window-time">{dirtiestWindow ? dirtiestWindow.label : 'Early Morning / Evening'}</span>
          </div>
          <p className="window-desc">
            {dirtiestWindow
              ? dirtiestWindow.reason
              : 'Winter surface cooling and vehicular rush-hour concentrate pollutants near the ground.'}
          </p>
        </div>
      </div>

      {/* Top 3 High-Impact Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
          Top Three Actions for Your Household Today
        </h2>
        <button
          type="button"
          onClick={onOpenSettings}
          style={{ background: 'none', border: 'none', textDecoration: 'underline', color: 'var(--text-muted)', fontSize: '0.8125rem', cursor: 'pointer' }}
        >
          Edit household profile
        </button>
      </div>

      <div className="actions-list" role="feed" aria-label="Top 3 recommended actions">
        {topActions.map((action) => (
          <ActionCard key={action.id} action={action} />
        ))}
      </div>
    </section>
  );
};
