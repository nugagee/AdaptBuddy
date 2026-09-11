export const MATHS_PRACTICE_IDS = ['dyscalculia-pattern-blocks', 'dyscalculia-real-world'] as const;
export type MathsPracticeId = typeof MATHS_PRACTICE_IDS[number];
export const isDyscalculiaPracticeActivity = (id: string): id is MathsPracticeId =>
  MATHS_PRACTICE_IDS.some(value => value === id);

export interface PatternToken { id: string; label: string; symbol?: string; count?: number; }
export const PATTERN_TOKENS: PatternToken[] = [
  { id: 'circle', label: 'Circle', symbol: '●' },
  { id: 'square', label: 'Square', symbol: '■' },
  { id: 'triangle', label: 'Triangle', symbol: '▲' },
  ...Array.from({ length: 6 }, (_, index) => ({ id: String(index + 1), label: `${index + 1} ${index === 0 ? 'counter' : 'counters'}`, count: index + 1 })),
];
export interface PatternExample {
  id: string; title: string; sequence: string[]; expected: string[]; choices: string[];
  hint: string; explanation: string;
}
export const PATTERN_EXAMPLES: PatternExample[] = [
  {
    id: 'pair', title: 'Two-shape rhythm',
    sequence: ['circle', 'square', 'circle', 'square'], expected: ['circle', 'square'],
    choices: ['circle', 'square', 'triangle'],
    hint: 'Look for the pair that repeats: circle, then square.',
    explanation: 'The pair Circle, Square repeats. The next two blocks are Circle, Square.',
  },
  {
    id: 'triple', title: 'Three-shape rhythm',
    sequence: ['circle', 'circle', 'triangle', 'circle', 'circle', 'triangle'], expected: ['circle', 'circle'],
    choices: ['circle', 'square', 'triangle'],
    hint: 'The repeating group has three shapes: circle, circle, triangle.',
    explanation: 'Circle, Circle, Triangle repeats. The next group begins with Circle, Circle; a Triangle would follow them.',
  },
  {
    id: 'growing', title: 'Growing counter groups',
    sequence: ['1', '2', '3', '4'], expected: ['5', '6'], choices: ['1', '2', '3', '4', '5', '6'],
    hint: 'Each group has one more counter than the group before it.',
    explanation: 'The groups grow by one: 1, 2, 3, 4, 5, 6. After 4 come groups of 5 and 6 counters.',
  },
];

export interface MathsStory {
  id: string; title: string; start: number; change: number; operation: 'add' | 'subtract';
  max: number; unit: string; plural: string; introduction: string; changeText: string; question: string;
  hint: string; capacity?: number;
}
export const MATHS_STORIES: MathsStory[] = [
  {
    id: 'table', title: 'Set the table', start: 2, change: 3, operation: 'add', max: 8,
    unit: 'cup', plural: 'cups', introduction: 'There are 2 cups on a pretend table.',
    changeText: 'Add 3 more cups.', question: 'How many cups are on the table altogether?',
    hint: 'Start at 2. Add one cup three times: 3, 4, 5.',
  },
  {
    id: 'fruit', title: 'Share the fruit', start: 6, change: 2, operation: 'subtract', max: 8,
    unit: 'fruit piece', plural: 'fruit pieces', introduction: 'There are 6 fruit pieces in a pretend bowl.',
    changeText: 'Give away 2 fruit pieces.', question: 'How many fruit pieces are left in the bowl?',
    hint: 'Start at 6. Take away one piece twice: 5, 4.',
  },
  {
    id: 'jug', title: 'Fill the pretend jug', start: 1, change: 2, operation: 'add', max: 4,
    unit: 'equal measure', plural: 'equal measures', capacity: 4,
    introduction: 'A pretend jug holds 4 equal measures. It already has 1 measure.',
    changeText: 'Add 2 more measures of the same size.', question: 'How many equal measures are in the jug now?',
    hint: 'One measure plus two measures makes three. Each measure is one quarter of this pretend jug.',
  },
];
export const storyAnswer = (story: MathsStory) => story.operation === 'add' ? story.start + story.change : story.start - story.change;
export const quantityLabel = (story: MathsStory, count: number) => `${count} ${count === 1 ? story.unit : story.plural}`;
