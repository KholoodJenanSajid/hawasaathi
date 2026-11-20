import React, { useState } from 'react';
import { UserProfile } from '../types/profile';
import { AirDataState } from '../types/air';
import { calculateRoomCadrHint } from '../lib/impact';

interface IndoorsViewProps {
  profile: UserProfile;
  airState: AirDataState;
  onUpdateRoomDims: (l: number, w: number, h: number) => void;
}

export const IndoorsView: React.FC<IndoorsViewProps> = ({
  profile,
  airState,
  onUpdateRoomDims,
}) => {
  const [lengthM, setLengthM] = useState<number>(profile.lifestyle.roomLengthMeters);
  const [widthM, setWidthM] = useState<number>(profile.lifestyle.roomWidthMeters);
  const [heightM, setHeightM] = useState<number>(profile.lifestyle.roomHeightMeters);
  const [unitMode, setUnitMode] = useState<'meters' | 'feet'>('meters');
  const [hasVulnerable, setHasVulnerable] = useState<boolean>(
    profile.household.hasVulnerability ||
      profile.household.children > 0 ||
      profile.household.olderAdults > 0
  );

  // Conversion for display if feet selected
  const feetToMeters = 0.3048;

  const currentLengthM = unitMode === 'feet' ? lengthM * feetToMeters : lengthM;
  const currentWidthM = unitMode === 'feet' ? widthM * feetToMeters : widthM;
  const currentHeightM = unitMode === 'feet' ? heightM * feetToMeters : heightM;

  const cadrResult = calculateRoomCadrHint(
    currentLengthM,
    currentWidthM,
    currentHeightM,
    hasVulnerable
  );

  const cleanestWindow = airState.cleanestWindow;
  const dirtiestWindow = airState.dirtiestWindow;

  return (
    <section aria-labelledby="indoors-heading">
      <div className="view-header">
        <h1 id="indoors-heading" className="view-title">
          Indoor Air Quality Guide
        </h1>
        <p className="view-subtitle">
          Evidence-based indoor air protection ordered strictly by source control first, timed ventilation second, and filtration third.
        </p>
      </div>

      {/* Safety & Myth-Busting Callout */}
      <div className="alert-box alert-info" style={{ marginBottom: '20px' }}>
        <strong>Public-Health Guidance on Ineffective Hacks:</strong> Beware of marketed shortcuts during severe smog:
        <ul style={{ paddingLeft: '20px', marginTop: '6px' }}>
          <li>
            <strong>Houseplants:</strong> While aesthetically pleasant, real-world peer-reviewed trials show potted plants cannot filter millions of microscopic combustion particles during a severe winter smog episode.
          </li>
          <li>
            <strong>Ozone Generators & Ionizers:</strong> Never use ozone generators or ionizing devices sold as air cleaners. Ozone is a potent lung irritant, and negative ionizers generate indoor secondary aerosol chemistry.
          </li>
          <li>
            <strong>Unventilated Chemical Sprays:</strong> Disinfectant sprays or synthetic aerosol deodorizers add volatile organic compounds (VOCs) that worsen airway inflammation.
          </li>
        </ul>
      </div>

      {/* Level 1: Source Control First */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '1.25rem' }}>🛑</span>
          <h2 className="card-title" style={{ margin: 0 }}>
            Level 1: Source Control (Stop Smoke at the Source)
          </h2>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          The fastest and cheapest way to lower indoor PM2.5 is stopping indoor combustion.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'var(--bg-canvas)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <strong>1. Eliminate Incense, Dhoop, and Mosquito Coils</strong>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Burning one traditional mosquito coil or scented dhoop releases particulate matter equal to 75–100 cigarettes into a closed bedroom. Swap with Velcro window mesh or liquid electric vaporizers.
            </p>
          </div>

          <div style={{ background: 'var(--bg-canvas)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <strong>2. Kitchen Source Control: Chimney Pre-Run & Pan Lids</strong>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Tadka (spice tempering) and deep-frying send ultra-fine aerosol droplets throughout the house. Start the exhaust chimney 1 minute before lighting the burner and cook with covered lids.
            </p>
          </div>

          <div style={{ background: 'var(--bg-canvas)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <strong>3. Wet Mopping Over Dry Broom Sweeping</strong>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Traditional jharoo sweeps kick settled particulate soot back into breathing height where it remains suspended for hours. Mop with a damp microfiber cloth to trap floor soot permanently.
            </p>
          </div>
        </div>
      </div>

      {/* Level 2: Timed Ventilation Second */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '1.25rem' }}>🪟</span>
          <h2 className="card-title" style={{ margin: 0 }}>
            Level 2: Timed Ventilation (Open Only When Ambient Drops)
          </h2>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          Never open windows automatically in the morning. Open windows only when the forecast window is actually cleaner than indoors would be from keeping them shut during a severe outdoor peak.
        </p>

        <div className="grid-2" style={{ marginBottom: '12px' }}>
          <div style={{ background: 'var(--olive-bg)', border: '1px solid var(--olive-border)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <strong style={{ color: 'var(--olive-text)' }}>✅ Safe Window for Today:</strong>
            <p style={{ fontSize: '0.875rem', marginTop: '4px' }}>
              {cleanestWindow
                ? `Cross-ventilate briefly for 15–20 minutes around ${cleanestWindow.label}. Ambient PM2.5 drops to its diurnal minimum as solar warmth mixes the atmosphere.`
                : 'Midday (12:30 PM – 2:30 PM) is usually the cleanest window for a 15-minute flush.'}
            </p>
          </div>

          <div style={{ background: 'var(--rust-bg)', border: '1px solid var(--rust-border)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <strong style={{ color: 'var(--rust-text)' }}>⛔ Keep Sealed During:</strong>
            <p style={{ fontSize: '0.875rem', marginTop: '4px' }}>
              {dirtiestWindow
                ? `Keep windows and balcony doors firmly shut around ${dirtiestWindow.label}. Cold surface inversion traps heavy traffic exhaust close to bedroom levels.`
                : 'Early morning (05:00 AM – 09:00 AM) and evening rush hours.'}
            </p>
          </div>
        </div>

        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Tip: Place a rolled bath towel or rubber draft stopper along the gap at the bottom of the front door to block smoke seeping in from shared apartment corridors.
        </p>
      </div>

      {/* Level 3: Filtration & Interactive Room Purifier Sizing Helper */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '1.25rem' }}>🌀</span>
          <h2 className="card-title" style={{ margin: 0 }}>
            Level 3: Filtration & Room Purifier Helper
          </h2>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Calculate the Clean Air Delivery Rate (CADR) sizing hint for your primary bedroom or living area.
        </p>

        {/* Room dimensions inputs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Room Dimensions</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`btn ${unitMode === 'meters' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ minHeight: '30px', padding: '2px 8px', fontSize: '0.75rem' }}
              onClick={() => setUnitMode('meters')}
            >
              Meters
            </button>
            <button
              type="button"
              className={`btn ${unitMode === 'feet' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ minHeight: '30px', padding: '2px 8px', fontSize: '0.75rem' }}
              onClick={() => setUnitMode('feet')}
            >
              Feet
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
          <div className="form-group">
            <label htmlFor="room-length-input" className="form-label">
              Length ({unitMode})
            </label>
            <input
              id="room-length-input"
              type="number"
              step="0.1"
              min="1"
              className="form-input"
              value={lengthM}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 1;
                setLengthM(val);
                onUpdateRoomDims(
                  unitMode === 'feet' ? val * feetToMeters : val,
                  currentWidthM,
                  currentHeightM
                );
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="room-width-input" className="form-label">
              Width ({unitMode})
            </label>
            <input
              id="room-width-input"
              type="number"
              step="0.1"
              min="1"
              className="form-input"
              value={widthM}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 1;
                setWidthM(val);
                onUpdateRoomDims(
                  currentLengthM,
                  unitMode === 'feet' ? val * feetToMeters : val,
                  currentHeightM
                );
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="room-height-input" className="form-label">
              Height ({unitMode})
            </label>
            <input
              id="room-height-input"
              type="number"
              step="0.1"
              min="1"
              className="form-input"
              value={heightM}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 1;
                setHeightM(val);
                onUpdateRoomDims(
                  currentLengthM,
                  currentWidthM,
                  unitMode === 'feet' ? val * feetToMeters : val
                );
              }}
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="checkbox-label">
            <input
              type="checkbox"
              className="checkbox-input"
              checked={hasVulnerable}
              onChange={(e) => setHasVulnerable(e.target.checked)}
            />
            <span>
              More vulnerable person in this room (child, older adult, or respiratory sensitivity) — increases target to 6 ACH
            </span>
          </label>
        </div>

        {/* CADR Sizing Result Box */}
        <div
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-strong)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', fontWeight: 700 }}>
                Clean Air Delivery Rate (CADR) Sizing Hint
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--olive-text)' }}>
                ~{cadrResult.cadrM3h} m³/h{' '}
                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  (~{cadrResult.cadrCfm} CFM)
                </span>
              </div>
            </div>

            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Room Volume: <strong>{cadrResult.volumeM3} m³</strong> | Target:{' '}
              <strong>{cadrResult.targetAch} ACH</strong> (Air Changes / Hour)
            </div>
          </div>

          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic' }}>
            ⚠️ {cadrResult.disclaimer} CADR indicates fan-and-filter throughput capacity under sealed conditions.
          </p>
        </div>

        {/* Budget filtration tips */}
        <div style={{ marginTop: '16px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <strong>Low-Cost Filtration Option:</strong> If commercial purifiers exceed budget, a DIY Box-Fan filter (standard box fan with a MERV 13 or true HEPA sheet sealed with duct tape along edges) provides equivalent particulate clean air delivery at a fraction of the cost (~₹2,000 vs ₹10,000+).
        </div>
      </div>
    </section>
  );
};
