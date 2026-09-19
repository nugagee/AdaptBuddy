export const AUDITORY_PRACTICE_IDS = ['auditory-caption-match', 'auditory-slow-speech'] as const;
export type AuditoryPracticeId = typeof AUDITORY_PRACTICE_IDS[number];
export const isAuditoryPracticeActivity = (id: string): id is AuditoryPracticeId => (
  AUDITORY_PRACTICE_IDS.some(value => value === id)
);

export interface CaptionExample {
  id: string;
  title: string;
  caption: string;
  answerId: string;
  choices: { id: string; label: string; symbol: string }[];
}
export const CAPTION_EXAMPLES: readonly CaptionExample[] = [
  { id: 'resting-cat', title: 'A resting cat', caption: 'The cat is sleeping on the mat.', answerId: 'cat', choices: [
    { id: 'dog', label: 'A dog running by a tree', symbol: '🐕 🌳' },
    { id: 'cat', label: 'A cat sleeping on a mat', symbol: '🐈 💤' },
    { id: 'bird', label: 'A bird flying over a house', symbol: '🐦 🏠' },
  ] },
  { id: 'book-bag', title: 'Packing a book', caption: 'The child puts a book in the bag.', answerId: 'book', choices: [
    { id: 'book', label: 'A book going into a bag', symbol: '📘 🎒' },
    { id: 'cup', label: 'A cup sitting on a table', symbol: '☕' },
    { id: 'ball', label: 'A ball rolling past a chair', symbol: '⚽' },
  ] },
  { id: 'rain-window', title: 'Rain outside', caption: 'Rain falls outside the window.', answerId: 'rain', choices: [
    { id: 'snow', label: 'Snow covering the ground', symbol: '❄️' },
    { id: 'sun', label: 'Sun shining over a garden', symbol: '☀️ 🌼' },
    { id: 'rain', label: 'Rain falling outside a window', symbol: '🌧️ 🪟' },
  ] },
];

export interface InstructionExample {
  id: string;
  title: string;
  steps: { text: string; keyword: string }[];
}
export const INSTRUCTION_EXAMPLES: readonly InstructionExample[] = [
  { id: 'drawing-kit', title: 'A drawing kit', steps: [
    { text: 'Choose a piece of paper for your drawing.', keyword: 'paper' },
    { text: 'Choose a pencil you would like to use.', keyword: 'pencil' },
    { text: 'Put the pencil beside the paper.', keyword: 'beside' },
  ] },
  { id: 'reading-space', title: 'A reading space', steps: [
    { text: 'Choose a book you would like to explore.', keyword: 'book' },
    { text: 'Find a comfortable place to read.', keyword: 'comfortable' },
    { text: 'Open the book at a page you choose.', keyword: 'page' },
  ] },
  { id: 'school-bag', title: 'A school bag', steps: [
    { text: 'Look at the list of things for your bag.', keyword: 'list' },
    { text: 'Choose one item from the list.', keyword: 'one item' },
    { text: 'Ask for help with anything you are unsure about.', keyword: 'help' },
  ] },
];

// Speech is restricted to original, fixed examples, never account or child-entered text.
export const AUDITORY_SPEECH_TEXTS = new Set([
  ...CAPTION_EXAMPLES.map(example => example.caption),
  ...INSTRUCTION_EXAMPLES.flatMap(example => example.steps.map(step => step.text)),
]);
export const AUDITORY_RATES = [0.6, 0.75, 1] as const;
export type AuditoryRate = typeof AUDITORY_RATES[number];
export const AUDITORY_CONTROL = 'min-h-12 min-w-12 rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-left font-semibold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-500 dark:bg-slate-900 dark:text-slate-100';
export const AUDITORY_PANEL = 'rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-slate-900 dark:border-indigo-800 dark:bg-indigo-950 dark:text-slate-100';
