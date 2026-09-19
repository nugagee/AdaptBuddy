export const SPEECH_LANGUAGE_ACTIVITY_IDS = [
  'speech-language-phrase-cards',
  'speech-language-sentence-builder',
  'speech-language-story-steps',
] as const;

export type SpeechLanguageActivityId = typeof SPEECH_LANGUAGE_ACTIVITY_IDS[number];
export interface CommunicationPracticeResult { durationMinutes: number; }
export const isSpeechLanguageActivity = (id: string): id is SpeechLanguageActivityId =>
  (SPEECH_LANGUAGE_ACTIVITY_IDS as readonly string[]).includes(id);

/** Original fixed examples only. No child text, recordings or communication assessments. */
export const PHRASE_GROUPS = [
  { id: 'help', label: 'Getting help', phrases: [
    'Please show me one step.', 'Please say that again.', 'I need help with this.',
  ] },
  { id: 'time', label: 'More time', phrases: [
    'I need a little more time.', 'I would like a break.', 'I am not ready yet.',
  ] },
  { id: 'join', label: 'Joining in', phrases: [
    'Can I join in?', 'My turn, please.', 'I would like to share an idea.',
  ] },
] as const;

export const SENTENCE_PARTS = [
  { id: 'who', label: 'Who?', choices: ['I', 'We', 'They'] },
  { id: 'action', label: 'Action', choices: ['read', 'draw', 'play'] },
  { id: 'place', label: 'Where?', choices: ['at home.', 'in the classroom.', 'at the park.'] },
] as const;

export const PRACTICE_STORIES = [
  { id: 'seed', title: 'A seed grows', cards: [
    { id: 'plant', emoji: '🪴', text: 'Sam puts a seed in a pot.' },
    { id: 'water', emoji: '💧', text: 'Sam gives the seed some water.' },
    { id: 'grow', emoji: '🌱', text: 'A small plant grows.' },
  ] },
  { id: 'library', title: 'A library visit', cards: [
    { id: 'choose', emoji: '📚', text: 'Alex chooses a book.' },
    { id: 'read', emoji: '📖', text: 'Alex reads a page.' },
    { id: 'return', emoji: '↩️', text: 'Alex returns the book.' },
  ] },
  { id: 'picture', title: 'Making a picture', cards: [
    { id: 'paper', emoji: '📄', text: 'Riley chooses some paper.' },
    { id: 'draw', emoji: '✏️', text: 'Riley draws a picture.' },
    { id: 'display', emoji: '🖼️', text: 'Riley puts the picture on display.' },
  ] },
] as const;

export const INITIAL_STORY_ORDER = [1, 2, 0];
