/** Fixed, original educational examples. No task text or planning choices are persisted. */
export const EXECUTIVE_ACTIVITY_IDS = [
  'executive-first-step',
  'executive-ready-checklist',
  'executive-change-plan',
] as const;
export type ExecutiveActivityId = typeof EXECUTIVE_ACTIVITY_IDS[number];
export const isExecutiveFunctionActivity = (id: string): id is ExecutiveActivityId =>
  (EXECUTIVE_ACTIVITY_IDS as readonly string[]).includes(id);
export interface PlanningPracticeResult { durationMinutes: number; }

export const FIRST_STEP_TASKS = [
  { id: 'learning', title: 'Start a learning task', steps: ['Put one thing I need nearby.', 'Look at one instruction.', 'Choose a place to begin.'] },
  { id: 'creative', title: 'Start something creative', steps: ['Choose one material.', 'Make one small mark.', 'Look at an example for ideas.'] },
  { id: 'organise', title: 'Organise a small space', steps: ['Choose one small area.', 'Find a home for one item.', 'Put one item where it belongs.'] },
] as const;
export const START_SUPPORTS = ['Try on my own', 'Ask someone to help', 'Take a pause first'] as const;
export const READY_CHECKLISTS = [
  { id: 'learning', title: 'For a learning task', items: ['Something to work on', 'Things I want to use', 'A place that works for me'] },
  { id: 'creative', title: 'For a creative activity', items: ['One idea to explore', 'Materials I want to use', 'A space for my activity'] },
  { id: 'moving-on', title: 'Before moving on', items: ['A stopping point', 'Things to keep or put away', 'An idea of what comes next'] },
] as const;
export const CHECKLIST_STATUSES = [
  { id: 'ready', label: 'Ready' },
  { id: 'not-needed', label: 'Not needed' },
  { id: 'help', label: 'Ask for help' },
] as const;
export const PLAN_ACTIVITIES = ['Reading', 'A creative activity', 'Organising things', 'Taking a break'] as const;
export const TRANSITION_SUPPORTS = ['Take a quiet pause', 'Ask for more time', 'Ask someone to explain what is next'] as const;
