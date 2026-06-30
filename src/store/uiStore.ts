import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AccessibilityPreferences, ThemeMode } from 'types/store';

const THEME_CLASSES: ThemeMode[] = ['light', 'dark', 'sepia'];

const getInitialTheme = (): ThemeMode => {
  try {
    const persisted = localStorage.getItem('adaptbuddy-ui');
    if (persisted) {
      const parsed = JSON.parse(persisted);
      const theme = parsed?.state?.theme as ThemeMode | undefined;
      if (theme && THEME_CLASSES.includes(theme)) return theme;
    }
    const legacy = localStorage.getItem('adaptbuddy-theme') as ThemeMode | null;
    if (legacy && THEME_CLASSES.includes(legacy)) return legacy;
  } catch {
    /* ignore */
  }
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }
  return 'light';
};

export const applyThemeToDocument = (theme: ThemeMode) => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove(...THEME_CLASSES);
  document.documentElement.classList.add(theme);
  if (theme === 'sepia') {
    document.documentElement.style.colorScheme = 'light';
  } else {
    document.documentElement.style.colorScheme = theme;
  }
};

interface UiState extends AccessibilityPreferences {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  setFontScale: (fontScale: number) => void;
  setDyslexiaFont: (dyslexiaFont: boolean) => void;
  setHighContrast: (highContrast: boolean) => void;
  syncThemeToDom: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: getInitialTheme(),
      reducedMotion: false,
      fontScale: 1,
      dyslexiaFont: false,
      highContrast: false,

      setTheme: (theme) => {
        set({ theme });
        applyThemeToDocument(theme);
      },

      toggleTheme: () => {
        const order: ThemeMode[] = ['light', 'dark', 'sepia'];
        const next = order[(order.indexOf(get().theme) + 1) % order.length];
        get().setTheme(next);
      },

      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setFontScale: (fontScale) => set({ fontScale: Math.min(2, Math.max(0.875, fontScale)) }),
      setDyslexiaFont: (dyslexiaFont) => set({ dyslexiaFont }),
      setHighContrast: (highContrast) => set({ highContrast }),

      syncThemeToDom: () => applyThemeToDocument(get().theme),
    }),
    {
      name: 'adaptbuddy-ui',
      partialize: (state) => ({
        theme: state.theme,
        reducedMotion: state.reducedMotion,
        fontScale: state.fontScale,
        dyslexiaFont: state.dyslexiaFont,
        highContrast: state.highContrast,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.syncThemeToDom();
      },
    }
  )
);
