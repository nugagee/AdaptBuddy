import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { MusicPlayerProvider } from 'contexts/MusicPlayerProvider';
import GlobalMusicPlayer from 'components/media/GlobalMusicPlayer';
import StoreInitializer from 'store/StoreInitializer';

interface AppProvidersProps {
  children: React.ReactNode;
}

const AppProviders: React.FC<AppProvidersProps> = ({ children }) => (
  <BrowserRouter>
    <StoreInitializer />
    <MusicPlayerProvider>
      {children}
      <GlobalMusicPlayer />
    </MusicPlayerProvider>
  </BrowserRouter>
);

export default AppProviders;
