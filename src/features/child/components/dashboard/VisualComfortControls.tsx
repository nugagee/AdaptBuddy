import React, { useId } from 'react';
import type { ComfortSettings } from './visualComfort';

export const COMFORT_BUTTON = 'min-h-12 rounded-xl border border-slate-400 px-4 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50';

interface Props {
  value: ComfortSettings;
  onChange: (value: ComfortSettings) => void;
  onReset: () => void;
}

/** Native labelled controls work with keyboard, touch and browser text zoom. */
const VisualComfortControls: React.FC<Props> = ({ value, onChange, onReset }) => {
  const id = useId();
  const selectClass = 'mt-1 min-h-12 w-full rounded-xl border border-slate-400 bg-white px-3 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600';
  return (
    <fieldset className="min-w-0 space-y-3 rounded-2xl border border-slate-300 p-4 dark:border-slate-600">
      <legend className="px-1 font-bold">My reading layout</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <label htmlFor={`${id}-background`} className="text-sm font-semibold">Page background
          <select id={`${id}-background`} className={selectClass} value={value.background} onChange={(event) => onChange({ ...value, background: event.target.value as ComfortSettings['background'] })}>
            <option value="cream">Cream</option><option value="white">White</option><option value="blue">Soft blue</option><option value="mint">Mint</option>
          </select>
        </label>
        <label htmlFor={`${id}-size`} className="text-sm font-semibold">Text size
          <select id={`${id}-size`} className={selectClass} value={value.textSize} onChange={(event) => onChange({ ...value, textSize: event.target.value as ComfortSettings['textSize'] })}>
            <option value="standard">Standard</option><option value="large">Large</option><option value="extra-large">Extra large</option>
          </select>
        </label>
        <label htmlFor={`${id}-font`} className="text-sm font-semibold">Font style
          <select id={`${id}-font`} className={selectClass} value={value.font} onChange={(event) => onChange({ ...value, font: event.target.value as ComfortSettings['font'] })}>
            <option value="sans">Simple sans serif</option><option value="serif">Book serif</option><option value="mono">Monospace</option>
          </select>
        </label>
        <label htmlFor={`${id}-spacing`} className="text-sm font-semibold">Line spacing
          <select id={`${id}-spacing`} className={selectClass} value={value.spacing} onChange={(event) => onChange({ ...value, spacing: event.target.value as ComfortSettings['spacing'] })}>
            <option value="comfortable">Comfortable</option><option value="wide">Wide</option><option value="extra-wide">Extra wide</option>
          </select>
        </label>
        <label htmlFor={`${id}-width`} className="text-sm font-semibold">Reading width
          <select id={`${id}-width`} className={selectClass} value={value.width} onChange={(event) => onChange({ ...value, width: event.target.value as ComfortSettings['width'] })}>
            <option value="narrow">Narrow</option><option value="medium">Medium</option><option value="wide">Wide</option>
          </select>
        </label>
        <label htmlFor={`${id}-ruler`} className="flex min-h-12 items-center gap-3 rounded-xl text-sm font-semibold">
          <input id={`${id}-ruler`} type="checkbox" className="h-6 w-6" checked={value.ruler} onChange={(event) => onChange({ ...value, ruler: event.target.checked })} />
          Reading ruler
        </label>
      </div>
      <button type="button" className={COMFORT_BUTTON} onClick={onReset}>Reset layout</button>
      <p className="text-sm">These are personal preferences, not a test or treatment. Your layout lasts only while this activity is open.</p>
    </fieldset>
  );
};

export default VisualComfortControls;
