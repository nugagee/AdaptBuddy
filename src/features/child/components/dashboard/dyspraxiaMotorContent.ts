export const DYSPRAXIA_MOTOR_IDS = ['dyspraxia-fine-motor', 'dyspraxia-gross-motor'] as const;
export type DyspraxiaMotorId = typeof DYSPRAXIA_MOTOR_IDS[number];
export const isDyspraxiaMotorActivity = (id: string): id is DyspraxiaMotorId =>
  DYSPRAXIA_MOTOR_IDS.some(value => value === id);

export const PLACEMENT_BOARDS = [
  { id: 'space', title: 'Space pieces', pieces: ['Moon', 'Star', 'Planet'], symbols: ['☾', '☆', '◉'] },
  { id: 'garden', title: 'Garden pieces', pieces: ['Leaf', 'Flower', 'Seed'], symbols: ['♧', '✿', '●'] },
  { id: 'shapes', title: 'Shape pieces', pieces: ['Circle', 'Square', 'Triangle'], symbols: ['○', '□', '△'] },
] as const;
export const PLACEMENT_SPACES = ['First space', 'Middle space', 'Last space'] as const;

/** Original optional everyday-action cards, not a prescribed therapy programme. */
export const MOVEMENT_CARDS = [
  {
    id: 'wave', title: 'Small wave', symbol: '👋',
    steps: ['Rest your arm comfortably beside you.', 'You could make a small wave with either hand, keeping your arm close to you.', 'Let your arm rest again whenever you choose.'],
  },
  {
    id: 'feet', title: 'Gentle foot taps', symbol: '👣',
    steps: ['Keep your feet supported in your usual comfortable seat.', 'You could gently tap one foot and then the other, without standing or leaning.', 'Rest your feet again whenever you choose.'],
  },
  {
    id: 'hands', title: 'Hands together and apart', symbol: '👐',
    steps: ['Rest your hands comfortably on your lap or usual support.', 'You could move your hands a little apart and together, keeping your arms close to you.', 'Let your hands rest again whenever you choose.'],
  },
] as const;

export const MOVEMENT_CHECKS = [
  'A trusted adult is here and has checked this action is suitable for me',
  'I am in my usual supported seat with clear space around me',
  'I feel comfortable and know I can stop; I will not push through pain',
] as const;

export const MOTOR_CONTROL = 'min-h-12 min-w-12 rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-left font-semibold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-500 dark:bg-slate-900 dark:text-slate-100';
export const MOTOR_PANEL = 'rounded-2xl border-2 border-teal-200 bg-teal-50 p-4 text-slate-900 dark:border-teal-800 dark:bg-slate-900 dark:text-slate-100';
