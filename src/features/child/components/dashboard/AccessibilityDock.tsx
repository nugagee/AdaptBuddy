import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from 'constants/routes';
import {
  getToolsForNeuros,
  type NeuroAccessibilityTool,
} from 'features/child/data/neuroDashboardContent';
import { useUiStore } from 'store/uiStore';

interface AccessibilityDockProps {
  neuroTypes: string[];
}

const AccessibilityDock: React.FC<AccessibilityDockProps> = ({ neuroTypes }) => {
  const navigate = useNavigate();
  const tools = getToolsForNeuros(neuroTypes);

  const {
    fontScale,
    dyslexiaFont,
    highContrast,
    reducedMotion,
    theme,
    setFontScale,
    setDyslexiaFont,
    setHighContrast,
    setReducedMotion,
    setTheme,
  } = useUiStore();

  const handleTool = (tool: NeuroAccessibilityTool) => {
    switch (tool.action) {
      case 'font-up':
        setFontScale(fontScale + 0.125);
        break;
      case 'font-down':
        setFontScale(fontScale - 0.125);
        break;
      case 'dyslexia-font':
        setDyslexiaFont(!dyslexiaFont);
        break;
      case 'high-contrast':
        setHighContrast(!highContrast);
        break;
      case 'sepia-theme':
        setTheme(theme === 'sepia' ? 'light' : 'sepia');
        break;
      case 'reduced-motion':
        setReducedMotion(!reducedMotion);
        break;
      case 'music':
        navigate(ROUTES.MUSIC);
        break;
      case 'writing':
        navigate(ROUTES.WRITING_PAD);
        break;
      case 'pronunciation':
        navigate(ROUTES.PRONUNCIATION_BUDDY);
        break;
      default:
        break;
    }
  };

  const isActive = (tool: NeuroAccessibilityTool): boolean => {
    switch (tool.action) {
      case 'dyslexia-font':
        return dyslexiaFont;
      case 'high-contrast':
        return highContrast;
      case 'sepia-theme':
        return theme === 'sepia';
      case 'reduced-motion':
        return reducedMotion;
      default:
        return false;
    }
  };

  if (tools.length === 0) return null;

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900 sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100 sm:text-xl">
          Accessibility Toolkit
        </h2>
        <p className="text-sm text-slate-500 dark:text-gray-400">
          One-tap tools matched to your profile — always within reach
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const active = isActive(tool);

          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => handleTool(tool)}
              className={`flex flex-col items-center rounded-2xl border-2 p-4 text-center transition hover:scale-[1.02] ${
                active
                  ? 'border-adapt-indigo bg-adapt-indigo/10 dark:border-adapt-cyan dark:bg-adapt-cyan/10'
                  : 'border-slate-100 bg-adapt-mist/30 hover:border-adapt-indigo/30 dark:border-gray-700 dark:bg-gray-800/50'
              }`}
            >
              <div
                className={`mb-2 flex h-11 w-11 items-center justify-center rounded-xl ${
                  active ? 'bg-adapt-indigo text-white' : 'bg-white dark:bg-gray-900'
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${active ? 'text-white' : 'text-adapt-indigo dark:text-adapt-cyan'}`}
                  aria-hidden
                />
              </div>
              <span className="text-sm font-bold text-adapt-navy dark:text-gray-100">{tool.label}</span>
              <span className="mt-1 text-xs text-slate-500 dark:text-gray-400">{tool.description}</span>
              {active && (
                <span className="mt-2 rounded-full bg-adapt-indigo/15 px-2 py-0.5 text-[10px] font-bold uppercase text-adapt-indigo dark:text-adapt-cyan">
                  On
                </span>
              )}
            </button>
          );
        })}
      </div>

      {fontScale !== 1 && (
        <p className="mt-4 text-center text-xs text-slate-500">
          Text size: {Math.round(fontScale * 100)}%
        </p>
      )}
    </section>
  );
};

export default AccessibilityDock;
