import React, { useState } from 'react';
import { UserProfile } from '../types/profile';
import { getRawStoredData, clearAllLocalData, resetProfile, STORAGE_KEY } from '../lib/storage';

interface HouseholdViewProps {
  profile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
  onOpenWizard: () => void;
}

export const HouseholdView: React.FC<HouseholdViewProps> = ({
  profile,
  onUpdateProfile,
  onOpenWizard,
}) => {
  const [showRawData, setShowRawData] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const handleReset = () => {
    if (window.confirm('Reset household profile to default baseline (Delhi, 2 adults, 1 child)?')) {
      const def = resetProfile();
      onUpdateProfile(def);
      setNotification('Profile successfully reset to default baseline.');
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleDeleteAll = () => {
    if (
      window.confirm(
        'Delete all local data? This will erase your stored profile and reset the application state completely.'
      )
    ) {
      clearAllLocalData();
      const def = resetProfile();
      onUpdateProfile(def);
      setNotification('All local data cleared from your browser storage.');
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const rawStorage = getRawStoredData();

  return (
    <section aria-labelledby="household-heading">
      <div className="view-header">
        <h1 id="household-heading" className="view-title">
          Household & Privacy Settings
        </h1>
        <p className="view-subtitle">
          Manage your location, household lifestyle preferences, and inspect data stored in your browser.
        </p>
      </div>

      {notification && (
        <div className="alert-box alert-success" role="status">
          {notification}
        </div>
      )}

      {/* Location Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 className="card-title" style={{ margin: 0 }}>
              📍 Location Details
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Used to query Open-Meteo live air forecasts.
            </p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={onOpenWizard}>
            Edit Location
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
          <div style={{ background: 'var(--bg-canvas)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>City Name</span>
            <div style={{ fontWeight: 700 }}>{profile.location.cityName}</div>
          </div>
          <div style={{ background: 'var(--bg-canvas)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>State / Region</span>
            <div style={{ fontWeight: 700 }}>{profile.location.state || 'N/A'}</div>
          </div>
          <div style={{ background: 'var(--bg-canvas)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Coordinates (~1km rounded)</span>
            <div style={{ fontWeight: 700 }}>
              {profile.location.latitude}, {profile.location.longitude}
            </div>
          </div>
        </div>
      </div>

      {/* Household Composition & Lifestyle Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 className="card-title" style={{ margin: 0 }}>
              👨‍👩‍👧 Household & Lifestyle Parameters
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Influences diurnal routine advice, outdoor precautions, and purifier sizing hints.
            </p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={onOpenWizard}>
            Edit Lifestyle & Habits
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '16px' }}>
          <div style={{ background: 'var(--bg-canvas)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Household Members</span>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
              {profile.household.adults} Adults • {profile.household.children} Children •{' '}
              {profile.household.olderAdults} Older Adults
            </div>
          </div>

          <div style={{ background: 'var(--bg-canvas)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Commute Mode & Distance</span>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
              {profile.lifestyle.commuteMode.replace('_', ' ')} ({profile.lifestyle.oneWayKm} km one-way,{' '}
              {profile.lifestyle.commuteDaysPerWeek} days/wk)
            </div>
          </div>

          <div style={{ background: 'var(--bg-canvas)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cooking Fuel & Incense</span>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
              Fuel: {profile.lifestyle.cookingFuel.replace('_', ' ')} | Coil/Incense:{' '}
              {profile.lifestyle.incenseOrMosquitoCoil ? 'Yes' : 'No'}
            </div>
          </div>

          <div style={{ background: 'var(--bg-canvas)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Room Size & Budget Band</span>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
              {profile.lifestyle.roomLengthMeters}m × {profile.lifestyle.roomWidthMeters}m ×{' '}
              {profile.lifestyle.roomHeightMeters}m | Band: {profile.lifestyle.budgetBand.replace('_', ' ')}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '12px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Sensitivity preference flag:{' '}
          <strong>{profile.household.hasVulnerability ? 'Enabled' : 'Disabled'}</strong> (stored only as a planning flag, never as a diagnosis).
        </div>
      </div>

      {/* Transparency: What is Stored Locally */}
      <div className="card">
        <h2 className="card-title">🔒 Transparency: What is Stored Locally</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
          HawaSaathi stores <strong>zero</strong> cookies, uses <strong>no</strong> third-party trackers, and requires <strong>no</strong> user account. Your location and household preferences are saved strictly in your browser’s local storage under key <code>{STORAGE_KEY}</code>.
        </p>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ minHeight: '36px', fontSize: '0.8125rem', marginBottom: '12px' }}
          onClick={() => setShowRawData(!showRawData)}
        >
          {showRawData ? 'Hide Stored JSON' : 'Inspect Stored Browser Data (JSON)'}
        </button>

        {showRawData && (
          <div
            style={{
              background: '#22211e',
              color: '#f5f1e8',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.75rem',
              overflowX: 'auto',
              maxHeight: '220px',
            }}
          >
            <pre>{rawStorage}</pre>
          </div>
        )}
      </div>

      {/* Danger Zone: Reset and Delete */}
      <div className="card" style={{ borderColor: 'var(--rust-border)' }}>
        <h2 className="card-title" style={{ color: 'var(--rust-text)' }}>
          Reset or Delete Data
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          You have full ownership of your data. You can reset to standard defaults or wipe all local storage completely.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            Reset to Default Baseline
          </button>
          <button type="button" className="btn btn-danger" onClick={handleDeleteAll}>
            Delete All Local Data
          </button>
        </div>
      </div>
    </section>
  );
};
