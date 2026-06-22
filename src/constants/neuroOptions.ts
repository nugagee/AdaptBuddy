import type { NeuroOption } from 'types/neuro';
import { neuroProfiles } from './neuroProfiles';

export const NEURO_OPTIONS: NeuroOption[] = neuroProfiles;

/** Neuro profiles available for selection today — others show as Coming Soon */
export const ACTIVE_NEURO_IDS = new Set<string>(['autism']);

export const NEURO_OPTION_MAP = Object.fromEntries(
  NEURO_OPTIONS.map((option) => [option.id, option]),
) as Record<string, NeuroOption>;
