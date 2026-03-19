import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <SunIcon className="w-6 h-6 text-yellow-500" />;
      case 'dark':
        return <MoonIcon className="w-6 h-6 text-indigo-400" />;
      case 'sepia':
        return <ComputerDesktopIcon className="w-6 h-6 text-amber-600" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light': return 'Light Mode';
      case 'dark': return 'Dark Mode';
      case 'sepia': return 'Comfort Mode';
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-gray-800/90 sepia:bg-amber-100/90 backdrop-blur-sm rounded-full shadow-lg hover:scale-105 transition-all duration-300 border border-gray-200 dark:border-gray-700 sepia:border-amber-300"
      aria-label="Toggle theme"
    >
      {getIcon()}
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 sepia:text-amber-800">
        {getLabel()}
      </span>
    </button>
  );
};

export default ThemeToggle;