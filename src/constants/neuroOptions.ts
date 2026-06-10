import type { NeuroOption } from 'types/neuro';
import { neuroProfiles } from './neuroProfiles';

export const NEURO_OPTIONS: NeuroOption[] = neuroProfiles;

export const NEURO_OPTION_MAP = Object.fromEntries(
  NEURO_OPTIONS.map((option) => [option.id, option]),
) as Record<string, NeuroOption>;
