export type ThemeMode = 'light' | 'dark' | 'sepia';

export interface AccessibilityPreferences {
  reducedMotion: boolean;
  fontScale: number;
  dyslexiaFont: boolean;
  highContrast: boolean;
}
