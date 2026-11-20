import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile } from './types/profile';
import { AirDataState } from './types/air';
import { loadProfile, saveProfile } from './lib/storage';
import { fetchLiveAirAndWeather } from './lib/api';
import { Header, ScreenId } from './components/Header';
import { SkipLink } from './components/SkipLink';
import { OnboardingModal } from './components/OnboardingModal';

// Views
import { TodayView } from './views/TodayView';
import { AirNowView } from './views/AirNowView';
import { RoutineView } from './views/RoutineView';
import { IndoorsView } from './views/IndoorsView';
import { SwapsView } from './views/SwapsView';
import { AskView } from './views/AskView';
import { HouseholdView } from './views/HouseholdView';

export const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('today');
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(() => !profile.onboardingCompleted);

  const [airState, setAirState] = useState<AirDataState>({
    current: null,
    currentHourly: null,
    hourly24h: [],
    cleanestWindow: null,
    dirtiestWindow: null,
    weather: null,
    dataTimestamp: null,
    timezone: 'auto',
    provider: 'Open-Meteo',
    lastSuccessTime: null,
    error: null,
    loading: true,
  });

  const loadAirData = useCallback(
    async (lat: number, lon: number) => {
      setAirState((prev) => ({ ...prev, loading: true, error: null }));
      const state = await fetchLiveAirAndWeather(lat, lon, airState.lastSuccessTime);
      setAirState(state);
    },
    [airState.lastSuccessTime]
  );

  // Fetch air data on mount and whenever location coordinates change
  useEffect(() => {
    loadAirData(profile.location.latitude, profile.location.longitude);
  }, [profile.location.latitude, profile.location.longitude, loadAirData]);

  const handleUpdateProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    saveProfile(newProfile);
  };

  const handleUpdateRoomDims = (l: number, w: number, h: number) => {
    const updated: UserProfile = {
      ...profile,
      lifestyle: {
        ...profile.lifestyle,
        roomLengthMeters: Number(l.toFixed(1)),
        roomWidthMeters: Number(w.toFixed(1)),
        roomHeightMeters: Number(h.toFixed(1)),
      },
    };
    handleUpdateProfile(updated);
  };

  return (
    <div className="app-container">
      <SkipLink />

      <Header
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        profile={profile}
        onOpenLocationEdit={() => setIsWizardOpen(true)}
      />

      <main id="main-content" tabIndex={-1}>
        {currentScreen === 'today' && (
          <TodayView
            airState={airState}
            profile={profile}
            onRefresh={() => loadAirData(profile.location.latitude, profile.location.longitude)}
            onOpenSettings={() => setIsWizardOpen(true)}
          />
        )}

        {currentScreen === 'air-now' && (
          <AirNowView airState={airState} cityName={profile.location.cityName} />
        )}

        {currentScreen === 'routine' && (
          <RoutineView airState={airState} profile={profile} />
        )}

        {currentScreen === 'indoors' && (
          <IndoorsView
            profile={profile}
            airState={airState}
            onUpdateRoomDims={handleUpdateRoomDims}
          />
        )}

        {currentScreen === 'swaps' && <SwapsView profile={profile} />}

        {currentScreen === 'ask' && (
          <AskView airState={airState} profile={profile} />
        )}

        {currentScreen === 'household' && (
          <HouseholdView
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            onOpenWizard={() => setIsWizardOpen(true)}
          />
        )}
      </main>

      {/* Onboarding & Profile Modal */}
      <OnboardingModal
        isOpen={isWizardOpen}
        initialProfile={profile}
        onSave={handleUpdateProfile}
        onClose={() => setIsWizardOpen(false)}
        isInitialOnboarding={!profile.onboardingCompleted}
      />

      <footer className="app-footer" role="contentinfo">
        <p className="footer-safety-note">
          <strong>Public-Health Guidance Notice:</strong> HawaSaathi provides daily operational guidance based on Open-Meteo hourly model data and standard Indian CPCB breakpoints. It is not an official government regulatory monitoring station and does not provide medical diagnoses or medical prescriptions.
        </p>
        <p>
          Version: hawasaathi-planning-2026.1 • Zero accounts • Zero external trackers • Private browser storage.
        </p>
      </footer>
    </div>
  );
};
