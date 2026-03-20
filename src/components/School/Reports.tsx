import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const Reports: React.FC = () => {
  const { theme } = useTheme();
  
  return (
    <div className={`p-6 rounded-2xl shadow-xl ${
      theme === 'light' ? 'bg-white' : theme === 'dark' ? 'bg-gray-800' : 'bg-sepia-50'
    }`}>
      <h2 className="text-2xl font-bold mb-6">📑 Reports</h2>
      <p className="text-gray-500">Reports generation coming soon...</p>
    </div>
  );
};

export default Reports;