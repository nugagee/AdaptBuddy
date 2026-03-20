import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const Students: React.FC = () => {
  const { theme } = useTheme();
  
  return (
    <div className={`p-6 rounded-2xl shadow-xl ${
      theme === 'light' ? 'bg-white' : theme === 'dark' ? 'bg-gray-800' : 'bg-sepia-50'
    }`}>
      <h2 className="text-2xl font-bold mb-6">🧑‍🎓 Students</h2>
      <p className="text-gray-500">Student management coming soon...</p>
    </div>
  );
};

export default Students;