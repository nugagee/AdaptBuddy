import React, { useState } from 'react';
import NeuroSelector from './components/NeuroSelector/NeuroSelector';
import Dashboard from './pages/Dashboard';
import ParentHub from './pages/ParentHub';

function App() {
  const [currentPage, setCurrentPage] = useState<'neuro' | 'dashboard' | 'parent'>('neuro');

  return (
    <>
      {currentPage === 'neuro' ? (
        <NeuroSelector onContinue={() => setCurrentPage('dashboard')} />
      ) : currentPage === 'dashboard' ? (
        <Dashboard />
      ) : (
        <ParentHub />
      )}
    </>
  );
}

export default App;