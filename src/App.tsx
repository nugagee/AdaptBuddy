import React from 'react';
import AppProviders from 'app/providers';
import MainLayout from 'layouts/MainLayout';
import AppRoutes from 'routes/AppRoutes';

function App() {
  return (
    <AppProviders>
      <MainLayout>
        <AppRoutes />
      </MainLayout>
    </AppProviders>
  );
}

export default App;
