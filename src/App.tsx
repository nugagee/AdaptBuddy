import React, { useState } from 'react';
import NeuroSelector from './components/NeuroSelector/NeuroSelector';
import Dashboard from './pages/Dashboard';
import ParentHub from './pages/ParentHub';

function App() {
  const [currentPage, setCurrentPage] = useState<'neuro' | 'dashboard' | 'parent'>('neuro');

  return (
    <>
      {/* FLOATING NAVIGATION - SIMPLE & CLEAR */}
      <div className="fixed bottom-4 right-4 z-50 bg-white p-3 rounded-2xl shadow-2xl border-2 border-blue-200">
        <div className="flex flex-col gap-2">
          <button 
            onClick={() => setCurrentPage('neuro')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 ${currentPage === 'neuro' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            <span>🧠</span> Neuro-Selector
          </button>
          <button 
            onClick={() => setCurrentPage('dashboard')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 ${currentPage === 'dashboard' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
          >
            <span>📱</span> Child Dashboard
          </button>
          <button 
            onClick={() => setCurrentPage('parent')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 ${currentPage === 'parent' ? 'bg-purple-600 text-white' : 'bg-gray-100'}`}
          >
            <span>👨‍👩‍👧‍👦</span> Parent Hub
          </button>
        </div>
      </div>

      {/* SHOW CURRENT PAGE */}
      {currentPage === 'neuro' && <NeuroSelector onContinue={() => setCurrentPage('dashboard')} />}
      {currentPage === 'dashboard' && <Dashboard />}
      {currentPage === 'parent' && <ParentHub />}
    </>
  );
}

export default App;