import type { CSSProperties } from 'react';

export const VISUAL_ACTIVITY_IDS = ['visual-comfort-read', 'visual-font-lab', 'visual-break-2020'] as const;
export type VisualActivityId = typeof VISUAL_ACTIVITY_IDS[number];
export const isVisualStressActivity = (id: string): id is VisualActivityId =>
  VISUAL_ACTIVITY_IDS.some((known) => known === id);

export interface ComfortSettings {
  background: 'cream' | 'white' | 'blue' | 'mint';
  textSize: 'standard' | 'large' | 'extra-large';
  font: 'sans' | 'serif' | 'mono';
  spacing: 'comfortable' | 'wide' | 'extra-wide';
  width: 'narrow' | 'medium' | 'wide';
  ruler: boolean;
}

export const DEFAULT_COMFORT: ComfortSettings = {
  background: 'cream', textSize: 'large', font: 'sans',
  spacing: 'wide', width: 'medium', ruler: true,
};

export const comfortPreviewStyle = (settings: ComfortSettings): CSSProperties => ({
  backgroundColor: { cream: '#fff5df', white: '#ffffff', blue: '#eaf4ff', mint: '#eaf8ee' }[settings.background],
  color: '#172033',
  fontSize: { standard: '1.125rem', large: '1.5rem', 'extra-large': '1.875rem' }[settings.textSize],
  fontFamily: { sans: 'Arial, sans-serif', serif: 'Georgia, serif', mono: 'ui-monospace, monospace' }[settings.font],
  lineHeight: { comfortable: 1.6, wide: 1.9, 'extra-wide': 2.2 }[settings.spacing],
  maxWidth: { narrow: '32ch', medium: '46ch', wide: '60ch' }[settings.width],
  width: '100%',
  overflowWrap: 'anywhere',
});

export const COMFORT_PASSAGES = [
  {
    id: 'quiet-garden', title: 'A Quiet Garden',
    lines: ['A small gate opens into a garden.', 'A bee rests on a yellow flower.', 'A bench waits under the tree.', 'I can stop and notice one thing.'],
  },
  {
    id: 'paper-boat', title: 'The Paper Boat',
    lines: ['Sam folds a square of paper.', 'The corners meet to make a boat.', 'The boat rests on the table.', 'Sam chooses a name for the boat.'],
  },
  {
    id: 'kind-note', title: 'A Kind Note',
    lines: ['Ari finds a small card.', 'The card says, thank you for helping.', 'Ari puts it beside a book.', 'A small kind act can matter.'],
  },
] as const;

/** Completion records contain time only, not reading choices or layout preferences. */
export interface VisualActivityResult {
  durationMinutes: number;
}
