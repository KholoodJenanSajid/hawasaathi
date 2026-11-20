import React, { useState } from 'react';
import { UserProfile } from '../types/profile';
import { generateSwaps } from '../lib/planner';
import { calculateTransportEmissions, IMPACT_MATH_VERSION } from '../lib/impact';

interface SwapsViewProps {
  profile: UserProfile;
}

export const SwapsView: React.FC<SwapsViewProps> = ({ profile }) => {
  const [filterCategory, setFilterCategory] = useState<'All' | 'Transport' | 'Household Habits' | 'Community Action'>('All');

  const swaps = generateSwaps(profile);
  const transportCalc = calculateTransportEmissions(
    profile.lifestyle.commuteMode,
    profile.lifestyle.oneWayKm,
    profile.lifestyle.commuteDaysPerWeek,
    profile.lifestyle.carpoolOccupancy
  );

  const filteredSwaps =
    filterCategory === 'All'
      ? swaps
      : swaps.filter((s) => s.category === filterCategory);

  return (
    <section aria-labelledby="swaps-heading">
      <div className="view-header">
        <h1 id="swaps-heading" className="view-title">
          Sustainable Alternatives & Swaps
        </h1>
        <p className="view-subtitle">
          Practical lifestyle swaps for transport, home habits, and neighborhood action with transparent impact math.
        </p>
      </div>

      {/* Transport Impact Mathematical Summary Card */}
      <div className="card" style={{ borderLeft: '4px solid var(--olive-base)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', fontWeight: 700 }}>
              Deterministic Transport Emissions Model ({IMPACT_MATH_VERSION})
            </span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px' }}>
              Your Household Commute Footprint
            </h2>
          </div>
          <span style={{ fontSize: '0.8125rem', background: 'var(--bg-subtle)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
            Mode: <strong>{profile.lifestyle.commuteMode.replace('_', ' ')}</strong> ({profile.lifestyle.oneWayKm} km, {profile.lifestyle.commuteDaysPerWeek} d/wk)
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', margin: '16px 0' }}>
          <div style={{ background: 'var(--bg-canvas)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Weekly Emissions</span>
            <span style={{ fontSize: '1.375rem', fontWeight: 800 }}>
              {transportCalc.weeklyKgCo2e} kg
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>CO2e / week</span>
          </div>

          <div style={{ background: 'var(--bg-canvas)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Monthly Emissions</span>
            <span style={{ fontSize: '1.375rem', fontWeight: 800 }}>
              {transportCalc.monthlyKgCo2e} kg
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>CO2e / month</span>
          </div>

          <div style={{ background: 'var(--bg-canvas)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Annual Emissions (±20% range)</span>
            <span style={{ fontSize: '1.375rem', fontWeight: 800 }}>
              {transportCalc.annualKgCo2e} kg
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
              [{transportCalc.annualRangeKgCo2e[0]} – {transportCalc.annualRangeKgCo2e[1]} kg]
            </span>
          </div>
        </div>

        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          <p>
            <strong>Baseline Comparison:</strong> A solo petrol/diesel car for this commute would emit{' '}
            <strong>{transportCalc.soloCarBaselineAnnualKg} kg CO2e/year</strong>.
            {transportCalc.savedVsCarAnnualKg > 0 ? (
              <span style={{ color: 'var(--olive-text)', fontWeight: 600 }}>
                {' '}Your current mode saves approximately {transportCalc.savedVsCarAnnualKg} kg CO2e/year (~{transportCalc.savedVsCarWeeklyKg} kg/week) compared to driving solo.
              </span>
            ) : (
              <span> You are currently in the solo car baseline. Carpooling or switching to public transit offers immediate reductions.</span>
            )}
          </p>
          <p style={{ marginTop: '4px', color: 'var(--text-muted)' }}>
            <em>Assumption: {transportCalc.assumption}. Factor version: {transportCalc.factorVersion}. Cycle and walking are designated near-zero tailpipe emissions without false sub-gram claims.</em>
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
        {(['All', 'Transport', 'Household Habits', 'Community Action'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            className={`btn ${filterCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
            style={{ minHeight: '36px', padding: '6px 12px', fontSize: '0.8125rem' }}
            onClick={() => setFilterCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Swaps Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredSwaps.map((swap) => (
          <article
            key={swap.id}
            className="card"
            style={{ marginBottom: 0 }}
            aria-labelledby={`swap-title-${swap.id}`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                {swap.category}
              </span>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                <span>Effort: <strong>{swap.effort}</strong></span> •{' '}
                <span>Rough Cost: <strong>{swap.roughCostRupees}</strong></span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '12px' }}>
              <div style={{ background: 'var(--rust-bg)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                <strong style={{ color: 'var(--rust-text)', fontSize: '0.875rem' }}>Current Habit:</strong>
                <p style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {swap.currentHabit}
                </p>
              </div>

              <div style={{ background: 'var(--olive-bg)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                <strong style={{ color: 'var(--olive-text)', fontSize: '0.875rem' }}>Sustainable Swap:</strong>
                <p id={`swap-title-${swap.id}`} style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--olive-text)', marginTop: '2px' }}>
                  {swap.alternative}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.875rem' }}>
              <div>
                <strong style={{ color: 'var(--olive-text)' }}>What Improves:</strong>{' '}
                <span>{swap.whatImproves}</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                <strong>What it does not change:</strong> {swap.whatItDoesNotChange}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
