import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'sepia';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    // Check localStorage first
    const saved = localStorage.getItem('adaptbuddy-theme') as ThemeMode;
    // Check system preference
    if (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return saved || 'light';
  });

  useEffect(() => {
    // Remove all theme classes
    document.documentElement.classList.remove('light', 'dark', 'sepia');
    // Add current theme class
    document.documentElement.classList.add(theme);
    // Save to localStorage
    localStorage.setItem('adaptbuddy-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'sepia';
      return 'light';
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};