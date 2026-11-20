import React from 'react';
import { AirDataState } from '../types/air';
import { UserProfile } from '../types/profile';
import { generateFullDayRoutine } from '../lib/planner';
import { ActionCard } from '../components/ActionCard';

interface RoutineViewProps {
  airState: AirDataState;
  profile: UserProfile;
}

export const RoutineView: React.FC<RoutineViewProps> = ({ airState, profile }) => {
  const { current, cleanestWindow, dirtiestWindow } = airState;
  const dayRoutines = generateFullDayRoutine(
    current,
    cleanestWindow,
    dirtiestWindow,
    profile
  );

  return (
    <section aria-labelledby="routine-heading">
      <div className="view-header">
        <h1 id="routine-heading" className="view-title">
          Low-Emission Daily Routine
        </h1>
        <p className="view-subtitle">
          Hour-by-hour operational routine fitted to today's forecast and your household composition.
        </p>
      </div>

      {/* Household Profile Context Banner */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: '20px',
          fontSize: '0.875rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          color: 'var(--text-secondary)',
        }}
      >
        <span>
          👨‍👩‍👧 <strong>Household:</strong> {profile.household.adults} adult(s),{' '}
          {profile.household.children} child(ren), {profile.household.olderAdults} senior(s)
        </span>
        <span>
          🛵 <strong>Commute:</strong> {profile.lifestyle.commuteMode.replace('_', ' ')} (
          {profile.lifestyle.oneWayKm} km)
        </span>
        <span>
          🍳 <strong>Cooking Fuel:</strong> {profile.lifestyle.cookingFuel.replace('_', ' ')}
        </span>
        {profile.household.hasVulnerability && (
          <span style={{ color: 'var(--ochre-text)', fontWeight: 600 }}>
            ⚠️ Sensitivity flag active
          </span>
        )}
      </div>

      {/* Diurnal Routine Blocks */}
      <div className="routine-blocks" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {dayRoutines.map((routine, idx) => (
          <article
            key={idx}
            className="card"
            style={{ marginBottom: 0 }}
            aria-labelledby={`day-part-${idx}`}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                flexWrap: 'wrap',
                gap: '8px',
                borderBottom: '1px solid var(--border-light)',
                paddingBottom: '10px',
                marginBottom: '12px',
              }}
            >
              <div>
                <h2 id={`day-part-${idx}`} style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  {routine.part}
                </h2>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  🕒 {routine.timeRange}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.4 }}>
              <strong>Air Dynamics:</strong> {routine.airQualityContext}
            </p>

            {/* Caution Banner for Older Adults or Children */}
            {routine.cautionForVulnerable && (
              <div
                className="alert-box alert-error"
                style={{
                  fontSize: '0.875rem',
                  padding: '8px 12px',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>🛡️</span>
                <span>
                  <strong>Vulnerable Guidance:</strong> {routine.cautionForVulnerable}
                </span>
              </div>
            )}

            {/* Recommended actions for this time block */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {routine.actions.map((act) => (
                <ActionCard key={act.id} action={act} />
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
