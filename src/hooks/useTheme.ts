import { useUiStore } from 'store/uiStore';
import type { ThemeMode } from 'types/store';

/** Theme + accessibility UI state (Zustand) */
export const useTheme = () => {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  return { theme, setTheme, toggleTheme } satisfies {
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;
    toggleTheme: () => void;
  };
};

/** Full accessibility preferences slice */
export const useAccessibility = () =>
  useUiStore((s) => ({
    reducedMotion: s.reducedMotion,
    fontScale: s.fontScale,
    dyslexiaFont: s.dyslexiaFont,
    highContrast: s.highContrast,
    setReducedMotion: s.setReducedMotion,
    setFontScale: s.setFontScale,
    setDyslexiaFont: s.setDyslexiaFont,
    setHighContrast: s.setHighContrast,
  }));
