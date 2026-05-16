import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import StoreInitializer from 'store/StoreInitializer';

interface AppProvidersProps {
  children: React.ReactNode;
}

const AppProviders: React.FC<AppProvidersProps> = ({ children }) => (
  <BrowserRouter>
    <StoreInitializer />
    {children}
  </BrowserRouter>
);

export default AppProviders;
