export type AutismTab =
  | 'profile'
  | 'schedule'
  | 'transition'
  | 'calm'
  | 'story'
  | 'communication';

const AUTISM_TABS = new Set<AutismTab>([
  'profile',
  'schedule',
  'transition',
  'calm',
  'story',
  'communication',
]);

export const resolveAutismTab = (tab: string | null): AutismTab =>
  tab && AUTISM_TABS.has(tab as AutismTab) ? (tab as AutismTab) : 'profile';
