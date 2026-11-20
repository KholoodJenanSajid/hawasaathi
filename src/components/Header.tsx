import React from 'react';
import { UserProfile } from '../types/profile';

export type ScreenId =
  | 'today'
  | 'air-now'
  | 'routine'
  | 'indoors'
  | 'swaps'
  | 'ask'
  | 'household';

interface HeaderProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  profile: UserProfile;
  onOpenLocationEdit: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  profile,
  onOpenLocationEdit,
}) => {
  const tabs: Array<{ id: ScreenId; label: string; icon: string }> = [
    { id: 'today', label: 'Today', icon: '☀️' },
    { id: 'air-now', label: 'Air now', icon: '💨' },
    { id: 'routine', label: 'Routine', icon: '📅' },
    { id: 'indoors', label: 'Indoors', icon: '🏡' },
    { id: 'swaps', label: 'Swaps', icon: '🔄' },
    { id: 'ask', label: 'Ask HawaSaathi', icon: '💬' },
    { id: 'household', label: 'Household', icon: '⚙️' },
  ];

  return (
    <header className="app-header" role="banner">
      <div className="header-top">
        <div className="brand-wrapper">
          <span className="brand-title">HawaSaathi</span>
          <span className="brand-tagline">Urban Air Quality Guide</span>
        </div>

        <div className="header-location-badge" role="region" aria-label="Current city location">
          <span>📍 {profile.location.cityName}</span>
          <button
            type="button"
            className="btn-header-edit"
            onClick={onOpenLocationEdit}
            aria-label={`Change current city: currently ${profile.location.cityName}`}
          >
            Change
          </button>
        </div>
      </div>

      <nav className="main-nav" aria-label="Main Navigation">
        {tabs.map((tab) => {
          const isActive = currentScreen === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className="nav-tab"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onNavigate(tab.id)}
            >
              <span aria-hidden="true">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};
