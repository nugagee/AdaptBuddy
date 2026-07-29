import type { ComponentType, SVGProps } from 'react';
import {
  BookOpen,
  HeartHandshake,
  Languages,
  MessageCircle,
  School,
  Smile,
  Sparkles,
  Type,
} from 'lucide-react';

export type PronunciationCategory = 'letters' | 'everyday' | 'names' | 'sentences' | 'school';

export interface PronunciationPracticeItem {
  id: string;
  category: PronunciationCategory;
  label: string;
  phrase: string;
  hint: string;
  breakdown: string[];
  example?: string;
  difficulty: 'gentle' | 'steady' | 'stretch';
}

export interface PronunciationCategoryMeta {
  id: PronunciationCategory;
  label: string;
  helper: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const PRONUNCIATION_CATEGORIES: PronunciationCategoryMeta[] = [
  {
    id: 'letters',
    label: 'Letters',
    helper: 'Sounds and letter names',
    icon: Type,
  },
  {
    id: 'everyday',
    label: 'Words',
    helper: 'Useful everyday words',
    icon: MessageCircle,
  },
  {
    id: 'names',
    label: 'Names',
    helper: 'Names that matter',
    icon: Smile,
  },
  {
    id: 'sentences',
    label: 'Sentences',
    helper: 'Short phrases to copy',
    icon: Languages,
  },
  {
    id: 'school',
    label: 'School',
    helper: 'Classroom words',
    icon: School,
  },
];

export const DEFAULT_PRONUNCIATION_ITEMS: PronunciationPracticeItem[] = [
  {
    id: 'letter-a',
    category: 'letters',
    label: 'A',
    phrase: 'A',
    hint: 'Open your mouth gently and let the sound come out clearly.',
    breakdown: ['A'],
    example: 'A as in apple.',
    difficulty: 'gentle',
  },
  {
    id: 'letter-m',
    category: 'letters',
    label: 'M',
    phrase: 'M',
    hint: 'Close your lips first, then hum the sound.',
    breakdown: ['M'],
    example: 'M as in moon.',
    difficulty: 'gentle',
  },
  {
    id: 'letter-s',
    category: 'letters',
    label: 'S',
    phrase: 'S',
    hint: 'Keep your tongue calm and let the air slide out.',
    breakdown: ['S'],
    example: 'S as in sun.',
    difficulty: 'gentle',
  },
  {
    id: 'hello',
    category: 'everyday',
    label: 'Hello',
    phrase: 'Hello',
    hint: 'Start soft, then open the last sound.',
    breakdown: ['He', 'llo'],
    example: 'Hello, I am here.',
    difficulty: 'gentle',
  },
  {
    id: 'please',
    category: 'everyday',
    label: 'Please',
    phrase: 'Please',
    hint: 'Press your lips together for the first sound.',
    breakdown: ['Please'],
    example: 'Please can I have help?',
    difficulty: 'steady',
  },
  {
    id: 'thank-you',
    category: 'everyday',
    label: 'Thank you',
    phrase: 'Thank you',
    hint: 'Say it in two calm parts.',
    breakdown: ['Thank', 'you'],
    example: 'Thank you for helping me.',
    difficulty: 'steady',
  },
  {
    id: 'adaptbuddy',
    category: 'names',
    label: 'AdaptBuddy',
    phrase: 'AdaptBuddy',
    hint: 'Break it into two friendly chunks.',
    breakdown: ['Adapt', 'Buddy'],
    example: 'AdaptBuddy helps me practise.',
    difficulty: 'steady',
  },
  {
    id: 'my-name-is',
    category: 'names',
    label: 'My name is',
    phrase: 'My name is',
    hint: 'Say one word at a time. No rush.',
    breakdown: ['My', 'name', 'is'],
    example: 'My name is Alex.',
    difficulty: 'gentle',
  },
  {
    id: 'i-need-help',
    category: 'sentences',
    label: 'I need help',
    phrase: 'I need help',
    hint: 'This is a powerful sentence. Say it slowly and clearly.',
    breakdown: ['I', 'need', 'help'],
    example: 'I need help with this task.',
    difficulty: 'gentle',
  },
  {
    id: 'i-feel-calm',
    category: 'sentences',
    label: 'I feel calm',
    phrase: 'I feel calm',
    hint: 'Breathe first, then say the phrase.',
    breakdown: ['I', 'feel', 'calm'],
    example: 'I feel calm now.',
    difficulty: 'steady',
  },
  {
    id: 'can-we-try-again',
    category: 'sentences',
    label: 'Can we try again?',
    phrase: 'Can we try again',
    hint: 'Use a gentle question voice at the end.',
    breakdown: ['Can', 'we', 'try', 'again'],
    example: 'Can we try again, please?',
    difficulty: 'stretch',
  },
  {
    id: 'reading',
    category: 'school',
    label: 'Reading',
    phrase: 'Reading',
    hint: 'Start with the R sound, then make the ending light.',
    breakdown: ['Read', 'ing'],
    example: 'I am reading today.',
    difficulty: 'steady',
  },
  {
    id: 'maths',
    category: 'school',
    label: 'Maths',
    phrase: 'Maths',
    hint: 'Touch your tongue gently for the final sound.',
    breakdown: ['Maths'],
    example: 'Maths is my next lesson.',
    difficulty: 'stretch',
  },
  {
    id: 'break-time',
    category: 'school',
    label: 'Break time',
    phrase: 'Break time',
    hint: 'Two clear words. Pause between them.',
    breakdown: ['Break', 'time'],
    example: 'It is break time.',
    difficulty: 'steady',
  },
];

export const PRONUNCIATION_BUDDY_PROMPTS = [
  {
    icon: Sparkles,
    title: 'Hear it',
    text: 'Listen first in a slow, clear voice.',
  },
  {
    icon: MessageCircle,
    title: 'Say it',
    text: 'Practise at your own pace with the microphone.',
  },
  {
    icon: HeartHandshake,
    title: 'Try again',
    text: 'Get gentle feedback without pressure.',
  },
  {
    icon: BookOpen,
    title: 'Keep words',
    text: 'Add names or words that matter to the child.',
  },
];
