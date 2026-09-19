import React from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { MusicPlayerProvider } from 'contexts/MusicPlayerProvider';
import GlobalMusicPlayer from 'components/media/GlobalMusicPlayer';
import ActivityTracker from 'components/analytics/ActivityTracker';
import DashboardSurveyPrompt from 'features/feedback/DashboardSurveyPrompt';
import StoreInitializer from 'store/StoreInitializer';
import { ROUTES } from 'constants/routes';

interface AppProvidersProps {
  children: React.ReactNode;
}

const RouteAwareGlobalMusicPlayer: React.FC = () => {
  const { pathname } = useLocation();

  if (pathname === ROUTES.GAME) return null;

  return <GlobalMusicPlayer />;
};

const AppProviders: React.FC<AppProvidersProps> = ({ children }) => (
  <BrowserRouter>
    <StoreInitializer />
    <ActivityTracker />
    <DashboardSurveyPrompt />
    <MusicPlayerProvider>
      {children}
      <RouteAwareGlobalMusicPlayer />
    </MusicPlayerProvider>
  </BrowserRouter>
);

export default AppProviders;
