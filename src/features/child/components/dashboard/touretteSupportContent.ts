export const TOURETTE_SUPPORT_IDS = ['tourettes-flex-flow', 'tourettes-tic-break'] as const;
export type TouretteSupportId = typeof TOURETTE_SUPPORT_IDS[number];
export const isTouretteSupportActivity = (id: string): id is TouretteSupportId => (
  TOURETTE_SUPPORT_IDS.some(candidate => candidate === id)
);

export const TIC_CONTROL = 'min-h-12 min-w-12 rounded-xl border-2 border-purple-300 bg-white px-4 py-3 text-left font-semibold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-purple-700 dark:bg-slate-900 dark:text-slate-100';
export const TIC_PANEL = 'rounded-2xl border-2 border-purple-200 bg-purple-50 p-4 text-slate-900 dark:border-purple-800 dark:bg-slate-950 dark:text-slate-100';
export const MAX_FLOW_CARDS = 6;
export interface FlowBoard {
  id: string;
  title: string;
  cards: ReadonlyArray<{ label: string; symbol: string }>;
}
export const FLOW_BOARDS: ReadonlyArray<FlowBoard> = [
  { id: 'space', title: 'Space scene', cards: [{ label: 'Star', symbol: '⭐' }, { label: 'Moon', symbol: '🌙' }, { label: 'Planet', symbol: '🪐' }] },
  { id: 'garden', title: 'Garden scene', cards: [{ label: 'Flower', symbol: '🌼' }, { label: 'Leaf', symbol: '🍃' }, { label: 'Butterfly', symbol: '🦋' }] },
  { id: 'room', title: 'Cosy room', cards: [{ label: 'Book', symbol: '📖' }, { label: 'Cushion', symbol: '🛋️' }, { label: 'Lamp', symbol: '💡' }] },
];
export const BREAK_MESSAGES = [
  'I need a break. Please give me time.',
  'Please give me some quiet space.',
  'I would like help from a trusted adult.',
] as const;

export interface FlowDraft { boardIndex: number; cards: number[] }
export const emptyFlowDraft = (): FlowDraft => ({ boardIndex: 0, cards: [] });
export const copyFlowDraft = (draft: FlowDraft): FlowDraft => ({ boardIndex: draft.boardIndex, cards: [...draft.cards] });
export const isFlowDraft = (value: unknown): value is FlowDraft => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<FlowDraft>;
  return typeof candidate.boardIndex === 'number' && Number.isInteger(candidate.boardIndex)
    && candidate.boardIndex >= 0 && candidate.boardIndex < FLOW_BOARDS.length
    && Array.isArray(candidate.cards) && candidate.cards.length <= MAX_FLOW_CARDS
    && Array.from(candidate.cards).every(card => typeof card === 'number' && Number.isInteger(card)
      && card >= 0 && card < FLOW_BOARDS[candidate.boardIndex!].cards.length);
};
