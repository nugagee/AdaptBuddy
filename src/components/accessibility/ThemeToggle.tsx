import React, { useCallback, useEffect, useState } from 'react';
import { SunIcon, MoonIcon, ComputerDesktopIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTheme } from 'hooks/useTheme';
import { useUiStore } from 'store/uiStore';

const THEME_HINT_KEY = 'adaptbuddy-theme-hint-dismissed';

interface ThemeToggleProps {
  /** `inline` for navbar; `floating` for fixed corner on app pages */
  variant?: 'floating' | 'inline';
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'floating' }) => {
  const isInline = variant === 'inline';
  const { theme, toggleTheme } = useTheme();
  const reducedMotion = useUiStore((s) => s.reducedMotion);

  const [showHint, setShowHint] = useState(() => {
    if (!isInline) return false;
    try {
      return localStorage.getItem(THEME_HINT_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const [systemReducedMotion, setSystemReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSystemReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const dismissHint = useCallback(() => {
    try {
      localStorage.setItem(THEME_HINT_KEY, '1');
    } catch {
      /* ignore */
    }
    setShowHint(false);
  }, []);

  useEffect(() => {
    if (!isInline || !showHint || reducedMotion || systemReducedMotion) return undefined;
    const timer = window.setTimeout(dismissHint, 14000);
    return () => window.clearTimeout(timer);
  }, [isInline, showHint, reducedMotion, systemReducedMotion, dismissHint]);

  const handleToggle = () => {
    toggleTheme();
    if (isInline) dismissHint();
  };

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <SunIcon className="h-5 w-5 text-yellow-500" />;
      case 'dark':
        return <MoonIcon className="h-5 w-5 text-indigo-400" />;
      case 'sepia':
        return <ComputerDesktopIcon className="h-5 w-5 text-amber-600" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'sepia':
        return 'Comfort';
    }
  };

  const hintVisible = isInline && showHint;
  const hintAnimated = hintVisible && !reducedMotion && !systemReducedMotion;

  const wrapperClass = isInline
    ? 'relative'
    : 'fixed right-4 top-[5.25rem] z-[45] md:top-4 md:z-[100]';

  const tooltipClass = isInline
    ? 'absolute top-full right-0 z-[110] mt-2 w-[min(17rem,calc(100vw-2.5rem))]'
    : 'absolute bottom-full right-0 mb-3 w-[min(16rem,calc(100vw-2rem))]';

  const tooltipMotion = hintAnimated
    ? isInline
      ? 'animate-theme-hint-down'
      : 'animate-slide-up'
    : '';

  const arrowClass = isInline
    ? 'absolute -top-1.5 right-4 h-3 w-3 rotate-45 border-l border-t border-adapt-indigo/20 bg-white dark:border-indigo-500/30 dark:bg-gray-800 sepia:border-amber-300/40 sepia:bg-amber-50'
    : 'absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 border-b border-r border-adapt-indigo/20 bg-white dark:border-indigo-500/30 dark:bg-gray-800 sepia:border-amber-300/40 sepia:bg-amber-50';

  return (
    <div className={wrapperClass}>
      {hintVisible && (
        <div
          role="status"
          className={`${tooltipClass} rounded-2xl border border-adapt-indigo/20 bg-white p-3 shadow-card dark:border-indigo-500/30 dark:bg-gray-800 sepia:border-amber-300/40 sepia:bg-amber-50 ${tooltipMotion}`}
        >
          <span className={arrowClass} aria-hidden />
          <div className="flex items-start justify-between gap-2">
            <p
              id="theme-hint-text"
              className="text-xs font-semibold leading-snug text-adapt-navy dark:text-gray-100 sepia:text-amber-950"
            >
              Choose a theme that feels comfortable — light, dark, or calm sepia.
            </p>
            <button
              type="button"
              onClick={dismissHint}
              className="shrink-0 rounded-lg p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-gray-700 sepia:hover:bg-amber-100"
              aria-label="Dismiss theme tip"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {hintAnimated && (
        <span
          className="pointer-events-none absolute inset-0 -m-1 rounded-full bg-adapt-indigo/25 animate-theme-cta-ring"
          aria-hidden
        />
      )}

      <button
        type="button"
        onClick={handleToggle}
        className={`relative flex items-center gap-1.5 rounded-full border bg-white/95 px-2.5 py-2 shadow-md backdrop-blur-sm transition-all duration-300 dark:border-gray-700 dark:bg-gray-800/95 sepia:border-amber-300 sepia:bg-amber-100/95 sm:gap-2 sm:px-3 ${
          hintAnimated
            ? 'animate-theme-cta-glow border-adapt-indigo/50 ring-2 ring-adapt-indigo/40 ring-offset-2 ring-offset-transparent'
            : hintVisible
              ? 'border-adapt-indigo/40 ring-1 ring-adapt-indigo/25'
              : 'border-gray-200 hover:scale-105 hover:shadow-lg dark:border-gray-700'
        } motion-reduce:animate-none motion-reduce:ring-0 motion-reduce:hover:scale-100`}
        aria-label="Choose your preferred theme: light, dark, or comfort mode"
        aria-describedby={hintVisible ? 'theme-hint-text' : undefined}
        aria-expanded={hintVisible}
      >
        {getIcon()}
        <span className="hidden text-xs font-semibold text-gray-700 dark:text-gray-200 sepia:text-amber-900 sm:inline sm:text-sm">
          {getLabel()}
        </span>
      </button>
    </div>
  );
};

export default ThemeToggle;
