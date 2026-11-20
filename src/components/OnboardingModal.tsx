import React, { useState, useEffect, useRef } from 'react';
import {
  UserProfile,
  LocationProfile,
  HouseholdMembers,
  LifestyleProfile,
  DEFAULT_PROFILE,
  CommuteMode,
  CookingFuel,
  BudgetBand,
  ExerciseTiming,
} from '../types/profile';
import { searchCities, GeocodeResult } from '../lib/api';
import { roundCoordinate } from '../lib/storage';

interface OnboardingModalProps {
  isOpen: boolean;
  initialProfile: UserProfile;
  onSave: (updatedProfile: UserProfile) => void;
  onClose: () => void;
  isInitialOnboarding?: boolean;
}

const COMMON_INDIAN_CITIES = [
  { name: 'Delhi', state: 'Delhi', lat: 28.61, lon: 77.21 },
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.85, lon: 80.95 },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.57, lon: 88.36 },
  { name: 'Patna', state: 'Bihar', lat: 25.59, lon: 85.14 },
  { name: 'Kanpur', state: 'Uttar Pradesh', lat: 26.45, lon: 80.33 },
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.08, lon: 72.88 },
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.97, lon: 77.59 },
  { name: 'Chandigarh', state: 'Punjab', lat: 30.73, lon: 76.78 },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  initialProfile,
  onSave,
  onClose,
  isInitialOnboarding = false,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Location state
  const [location, setLocation] = useState<LocationProfile>(initialProfile.location);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [manualCoords, setManualCoords] = useState(false);

  // Step 2: Household state
  const [household, setHousehold] = useState<HouseholdMembers>(initialProfile.household);

  // Step 3: Lifestyle state
  const [lifestyle, setLifestyle] = useState<LifestyleProfile>(initialProfile.lifestyle);

  const dialogRef = useRef<HTMLDivElement>(null);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isInitialOnboarding) {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isInitialOnboarding, onClose]);

  // Debounced city search
  useEffect(() => {
    if (!citySearchQuery || citySearchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchCities(citySearchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [citySearchQuery]);

  if (!isOpen) return null;

  const handleSelectCity = (result: GeocodeResult) => {
    setLocation({
      cityName: result.name,
      state: result.admin1,
      country: result.country || 'India',
      latitude: roundCoordinate(result.latitude),
      longitude: roundCoordinate(result.longitude),
    });
    setCitySearchQuery('');
    setSearchResults([]);
    setGeoError(null);
  };

  const handleQuickCity = (city: typeof COMMON_INDIAN_CITIES[0]) => {
    setLocation({
      cityName: city.name,
      state: city.state,
      country: 'India',
      latitude: roundCoordinate(city.lat),
      longitude: roundCoordinate(city.lon),
    });
    setGeoError(null);
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = roundCoordinate(pos.coords.latitude);
        const lon = roundCoordinate(pos.coords.longitude);
        setLocation({
          cityName: `Local coordinates (${lat}, ${lon})`,
          latitude: lat,
          longitude: lon,
          country: 'India',
        });
      },
      (err) => {
        setGeoError(`Location permission denied or unavailable: ${err.message}`);
      },
      { timeout: 8000 }
    );
  };

  const handleComplete = () => {
    const finalProfile: UserProfile = {
      version: 1,
      location: {
        ...location,
        latitude: roundCoordinate(location.latitude),
        longitude: roundCoordinate(location.longitude),
      },
      household,
      lifestyle,
      onboardingCompleted: true,
    };
    onSave(finalProfile);
    onClose();
  };

  const handleSkipAll = () => {
    onSave({
      ...DEFAULT_PROFILE,
      location: {
        ...location,
        latitude: roundCoordinate(location.latitude),
        longitude: roundCoordinate(location.longitude),
      },
      onboardingCompleted: true,
    });
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
    >
      <div className="modal-dialog" ref={dialogRef}>
        <div className="modal-header">
          <div>
            <h2 id="onboarding-modal-title" className="modal-title">
              {isInitialOnboarding ? 'Welcome to HawaSaathi' : 'Household Profile'}
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Step {step} of 3 — all fields skippable with sensible defaults
            </p>
          </div>
          {!isInitialOnboarding && (
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close dialog"
            >
              ✕
            </button>
          )}
        </div>

        {/* Progress pills */}
        <div className="wizard-steps-indicator" aria-hidden="true">
          <div className={`step-indicator-pill ${step >= 1 ? 'active' : ''}`} />
          <div className={`step-indicator-pill ${step >= 2 ? 'active' : ''}`} />
          <div className={`step-indicator-pill ${step >= 3 ? 'active' : ''}`} />
        </div>

        {/* Step 1: Location */}
        {step === 1 && (
          <div className="wizard-step-content">
            <h3 style={{ fontSize: '1.0625rem', marginBottom: '8px' }}>
              1. Where is your home located?
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              We fetch hourly Open-Meteo pollution and weather forecasts for your city.
              Coordinates are rounded to ~1 km for privacy.
            </p>

            {/* Currently selected location badge */}
            <div
              style={{
                background: 'var(--olive-bg)',
                border: '1px solid var(--olive-border)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                fontSize: '0.9375rem',
              }}
            >
              <strong>Selected Location:</strong> {location.cityName}{' '}
              {location.state ? `(${location.state})` : ''} — Lat: {location.latitude}, Lon: {location.longitude}
            </div>

            {/* City search */}
            <div className="form-group">
              <label htmlFor="city-search-input" className="form-label">
                Search city in India
              </label>
              <input
                id="city-search-input"
                type="text"
                className="form-input"
                placeholder="Type city name (e.g. Delhi, Lucknow, Kolkata)..."
                value={citySearchQuery}
                onChange={(e) => setCitySearchQuery(e.target.value)}
              />
              {isSearching && (
                <span className="form-hint">Searching cities...</span>
              )}
            </div>

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <div
                style={{
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  marginBottom: '16px',
                }}
              >
                {searchResults.map((res) => (
                  <button
                    key={res.id}
                    type="button"
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '10px 14px',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid var(--border-light)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
                    onClick={() => handleSelectCity(res)}
                  >
                    <strong>{res.name}</strong>, {res.admin1 ? `${res.admin1}, ` : ''}{res.country}
                  </button>
                ))}
              </div>
            )}

            {/* Quick city presets */}
            <div style={{ marginBottom: '16px' }}>
              <span className="form-label" style={{ display: 'block', marginBottom: '6px' }}>
                Or select a major hub:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {COMMON_INDIAN_CITIES.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.8125rem', minHeight: '32px' }}
                    onClick={() => handleQuickCity(c)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Geolocation & Manual Coords toggle */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleDetectLocation}
                style={{ fontSize: '0.875rem', minHeight: '36px' }}
              >
                📡 Use My Current Location
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setManualCoords(!manualCoords)}
                style={{ fontSize: '0.875rem', minHeight: '36px' }}
              >
                {manualCoords ? 'Hide Manual Coordinates' : 'Type Latitude & Longitude'}
              </button>
            </div>

            {geoError && (
              <div className="alert-box alert-error" role="alert" style={{ fontSize: '0.8125rem' }}>
                {geoError}
              </div>
            )}

            {manualCoords && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label htmlFor="lat-input" className="form-label">
                    Latitude
                  </label>
                  <input
                    id="lat-input"
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={location.latitude}
                    onChange={(e) =>
                      setLocation({ ...location, latitude: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lon-input" className="form-label">
                    Longitude
                  </label>
                  <input
                    id="lon-input"
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={location.longitude}
                    onChange={(e) =>
                      setLocation({ ...location, longitude: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={handleSkipAll}>
                Skip Setup (Use Defaults)
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setStep(2)}>
                Next: Household →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Household Members */}
        {step === 2 && (
          <div className="wizard-step-content">
            <h3 style={{ fontSize: '1.0625rem', marginBottom: '8px' }}>
              2. Who lives in your home?
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Allows HawaSaathi to customize school commutes, elder protections, and exposure alerts.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <div className="form-group">
                <label htmlFor="adults-input" className="form-label">
                  Adults
                </label>
                <input
                  id="adults-input"
                  type="number"
                  min="1"
                  max="20"
                  className="form-input"
                  value={household.adults}
                  onChange={(e) =>
                    setHousehold({ ...household, adults: parseInt(e.target.value) || 1 })
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="children-input" className="form-label">
                  Children
                </label>
                <input
                  id="children-input"
                  type="number"
                  min="0"
                  max="20"
                  className="form-input"
                  value={household.children}
                  onChange={(e) =>
                    setHousehold({ ...household, children: parseInt(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="seniors-input" className="form-label">
                  Older Adults
                </label>
                <input
                  id="seniors-input"
                  type="number"
                  min="0"
                  max="20"
                  className="form-input"
                  value={household.olderAdults}
                  onChange={(e) =>
                    setHousehold({ ...household, olderAdults: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={household.outdoorWorker}
                  onChange={(e) =>
                    setHousehold({ ...household, outdoorWorker: e.target.checked })
                  }
                />
                <span>Someone in the home works outdoors or commutes during peak smog</span>
              </label>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={household.hasVulnerability}
                  onChange={(e) =>
                    setHousehold({ ...household, hasVulnerability: e.target.checked })
                  }
                />
                <span>
                  Self-reported respiratory or health sensitivity (stored only as a planning preference flag, never as a diagnosis)
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
                Next: Lifestyle →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Lifestyle & Daily Habits */}
        {step === 3 && (
          <div className="wizard-step-content">
            <h3 style={{ fontSize: '1.0625rem', marginBottom: '8px' }}>
              3. Lifestyle and Daily Habits
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Used to calculate transport emissions, exposure proxies, and purifier CADR sizing hints.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div className="form-group">
                <label htmlFor="commute-mode-select" className="form-label">
                  Primary Commute Mode
                </label>
                <select
                  id="commute-mode-select"
                  className="form-select"
                  value={lifestyle.commuteMode}
                  onChange={(e) =>
                    setLifestyle({ ...lifestyle, commuteMode: e.target.value as CommuteMode })
                  }
                >
                  <option value="walk">Walk</option>
                  <option value="cycle">Bicycle</option>
                  <option value="two_wheeler">Two-Wheeler (Scooter/Bike)</option>
                  <option value="car">Car (Solo)</option>
                  <option value="carpool">Carpool / Shared Cab</option>
                  <option value="metro_bus">Metro or City Bus</option>
                  <option value="work_from_home">Work From Home</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="commute-km-input" className="form-label">
                  One-Way Distance (km)
                </label>
                <input
                  id="commute-km-input"
                  type="number"
                  min="0"
                  max="200"
                  className="form-input"
                  value={lifestyle.oneWayKm}
                  onChange={(e) =>
                    setLifestyle({ ...lifestyle, oneWayKm: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div className="form-group">
                <label htmlFor="commute-days-input" className="form-label">
                  Commute Days per Week
                </label>
                <input
                  id="commute-days-input"
                  type="number"
                  min="0"
                  max="7"
                  className="form-input"
                  value={lifestyle.commuteDaysPerWeek}
                  onChange={(e) =>
                    setLifestyle({
                      ...lifestyle,
                      commuteDaysPerWeek: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="exercise-timing-select" className="form-label">
                  Outdoor Exercise Timing
                </label>
                <select
                  id="exercise-timing-select"
                  className="form-select"
                  value={lifestyle.outdoorExerciseTiming}
                  onChange={(e) =>
                    setLifestyle({
                      ...lifestyle,
                      outdoorExerciseTiming: e.target.value as ExerciseTiming,
                    })
                  }
                >
                  <option value="early_morning">Early Morning</option>
                  <option value="midday">Midday</option>
                  <option value="evening">Evening</option>
                  <option value="none">None / Indoors</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div className="form-group">
                <label htmlFor="cooking-fuel-select" className="form-label">
                  Primary Cooking Fuel
                </label>
                <select
                  id="cooking-fuel-select"
                  className="form-select"
                  value={lifestyle.cookingFuel}
                  onChange={(e) =>
                    setLifestyle({
                      ...lifestyle,
                      cookingFuel: e.target.value as CookingFuel,
                    })
                  }
                >
                  <option value="lpg">LPG Cylinder / Piped Gas</option>
                  <option value="induction">Electric Induction / Electric Stove</option>
                  <option value="biomass_chulha">Biomass, Wood, or Chulha</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="budget-band-select" className="form-label">
                  Budget Band for Air Upgrades
                </label>
                <select
                  id="budget-band-select"
                  className="form-select"
                  value={lifestyle.budgetBand}
                  onChange={(e) =>
                    setLifestyle({
                      ...lifestyle,
                      budgetBand: e.target.value as BudgetBand,
                    })
                  }
                >
                  <option value="free">Free / Behavioral only</option>
                  <option value="under_1500">Under ₹1,500 (N95s, nets, door seals)</option>
                  <option value="1500_to_12000">₹1,500 – ₹12,000 (DIY Box-fan / Entry HEPA)</option>
                  <option value="premium">Premium (High CADR purifiers, sensors)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={lifestyle.incenseOrMosquitoCoil}
                  onChange={(e) =>
                    setLifestyle({ ...lifestyle, incenseOrMosquitoCoil: e.target.checked })
                  }
                />
                <span>We regularly light incense (agarbatti/dhoop) or mosquito coils</span>
              </label>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={lifestyle.hasPurifier}
                  onChange={(e) =>
                    setLifestyle({ ...lifestyle, hasPurifier: e.target.checked })
                  }
                />
                <span>We already own an indoor air purifier</span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
                ← Back
              </button>
              <button type="button" className="btn btn-primary" onClick={handleComplete}>
                Save & View Today's Plan ✓
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
