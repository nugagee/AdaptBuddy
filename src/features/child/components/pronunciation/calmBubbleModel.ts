export const CALM_DURATIONS = [60000, 120000, 0] as const;
export const CALM_CYCLES = [6000, 8000, 10000] as const;
export type CalmDuration = typeof CALM_DURATIONS[number];
export type CalmCycle = typeof CALM_CYCLES[number];

/** This is an optional visual rhythm, never a sensor or breathing assessment. */
export function calmBubbleFrame(elapsedMs: number, cycleMs: CalmCycle, watchOnly: boolean) {
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const cycle = CALM_CYCLES.includes(cycleMs) ? cycleMs : 8000;
  const phase = (elapsed % cycle) / cycle;
  const growing = phase < 0.5;
  return {
    scale: 0.72 + 0.28 * (0.5 - Math.cos(phase * 2 * Math.PI) / 2),
    key: `${Math.floor(elapsed / cycle)}-${growing ? 'in' : 'out'}`,
    cue: watchOnly ? (growing ? 'The bubble grows' : 'The bubble shrinks')
      : (growing ? 'Breathe in gently' : 'Breathe out gently'),
  };
}
