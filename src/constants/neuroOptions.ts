import type { NeuroOption } from 'types/neuro';
import { neuroProfiles } from './neuroProfiles';

export const NEURO_OPTIONS: NeuroOption[] = neuroProfiles;

/** Neuro profiles with dashboard missions and accessibility tools available today. */
export const ACTIVE_NEURO_IDS = new Set<string>([
  'autism',
  'adhd',
  'dyslexia',
  'dysgraphia',
  'dyscalculia',
  'dyspraxia',
  'tourettes',
  'auditory',
  'spd',
  'visual-stress',
]);

export const NEURO_OPTION_MAP = Object.fromEntries(
  NEURO_OPTIONS.map((option) => [option.id, option]),
) as Record<string, NeuroOption>;
