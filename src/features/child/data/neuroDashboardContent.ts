import type { ComponentType, SVGProps } from 'react';
import {
  Brain,
  Zap,
  BookOpen,
  PenTool,
  Calculator,
  Target,
  Waves,
  Volume2,
  Sun,
  Sparkles,
  Calendar,
  Timer,
  Heart,
  Gamepad2,
  Mic,
  Palette,
  LineChart,
  Headphones,
  Pause,
  Type,
  Eye,
  Hand,
  Music,
  LayoutGrid,
  Star,
  Wind,
} from 'lucide-react';
import { ROUTES } from 'constants/routes';

export type NeuroActivityCategory =
  | 'focus'
  | 'literacy'
  | 'math'
  | 'motor'
  | 'regulation'
  | 'social'
  | 'creative';

export interface NeuroActivity {
  id: string;
  neuroId: string;
  title: string;
  description: string;
  durationMinutes: number;
  category: NeuroActivityCategory;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Internal design rationale; do not present as a clinical claim. */
  inspiration: string;
  /** Planned activities stay visible but cannot be launched or award progress. */
  availability?: 'ready' | 'planned';
  availabilityNote?: string;
  route?: string;
  /** Opens feelings journal, focus timer, etc. */
  action?: 'journal' | 'focus-timer' | 'music' | 'writing';
  starsReward: number;
}

export interface NeuroAccessibilityTool {
  id: string;
  neuroIds: string[];
  label: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  action:
    | 'font-up'
    | 'font-down'
    | 'dyslexia-font'
    | 'high-contrast'
    | 'sepia-theme'
    | 'reduced-motion'
    | 'music'
    | 'writing'
    | 'pronunciation';
}

export interface NeuroMetricDefinition {
  neuroId: string;
  label: string;
  unit: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Baseline daily target */
  dailyTarget: number;
}

export interface NeuroZoneMeta {
  neuroId: string;
  tagline: string;
  dailyGoalLabel: string;
  gradient: string;
  glow: string;
  chip: string;
}

export const NEURO_ZONE_META: Record<string, NeuroZoneMeta> = {
  autism: {
    neuroId: 'autism',
    tagline: 'Predictable paths, visual clarity, calm routines',
    dailyGoalLabel: 'Routine & visual tasks',
    gradient: 'from-sky-400/20 via-indigo-400/10 to-blue-500/5',
    glow: 'shadow-[0_12px_40px_-12px_rgba(56,189,248,0.35)]',
    chip: 'bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200',
  },
  adhd: {
    neuroId: 'adhd',
    tagline: 'Short bursts, movement, and instant wins',
    dailyGoalLabel: 'Focus sprints & energy breaks',
    gradient: 'from-amber-400/20 via-orange-400/10 to-yellow-500/5',
    glow: 'shadow-[0_12px_40px_-12px_rgba(251,191,36,0.35)]',
    chip: 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
  },
  dyslexia: {
    neuroId: 'dyslexia',
    tagline: 'Hear it, see it, trace it — multisensory reading',
    dailyGoalLabel: 'Reading & phonics missions',
    gradient: 'from-violet-400/20 via-purple-400/10 to-fuchsia-500/5',
    glow: 'shadow-[0_12px_40px_-12px_rgba(167,139,250,0.35)]',
    chip: 'bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200',
  },
  dysgraphia: {
    neuroId: 'dysgraphia',
    tagline: 'Your voice is your pen — express without friction',
    dailyGoalLabel: 'Writing & motor missions',
    gradient: 'from-emerald-400/20 via-green-400/10 to-teal-500/5',
    glow: 'shadow-[0_12px_40px_-12px_rgba(52,211,153,0.35)]',
    chip: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200',
  },
  dyscalculia: {
    neuroId: 'dyscalculia',
    tagline: 'Numbers as pictures, patterns, and stories',
    dailyGoalLabel: 'Visual math explorations',
    gradient: 'from-rose-400/20 via-red-400/10 to-pink-500/5',
    glow: 'shadow-[0_12px_40px_-12px_rgba(251,113,133,0.35)]',
    chip: 'bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200',
  },
  dyspraxia: {
    neuroId: 'dyspraxia',
    tagline: 'Small steps, big coordination wins',
    dailyGoalLabel: 'Motor & movement games',
    gradient: 'from-teal-400/20 via-cyan-400/10 to-emerald-500/5',
    glow: 'shadow-[0_12px_40px_-12px_rgba(45,212,191,0.35)]',
    chip: 'bg-teal-100 text-teal-900 dark:bg-teal-950/50 dark:text-teal-200',
  },
  spd: {
    neuroId: 'spd',
    tagline: 'Your senses set the pace — regulate first, learn next',
    dailyGoalLabel: 'Sensory regulation check-ins',
    gradient: 'from-pink-400/20 via-fuchsia-400/10 to-rose-500/5',
    glow: 'shadow-[0_12px_40px_-12px_rgba(244,114,182,0.35)]',
    chip: 'bg-pink-100 text-pink-900 dark:bg-pink-950/50 dark:text-pink-200',
  },
  auditory: {
    neuroId: 'auditory',
    tagline: 'See what you hear — captions, cues, and clarity',
    dailyGoalLabel: 'Listening & visual-audio tasks',
    gradient: 'from-indigo-400/20 via-blue-400/10 to-violet-500/5',
    glow: 'shadow-[0_12px_40px_-12px_rgba(129,140,248,0.35)]',
    chip: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200',
  },
  'visual-stress': {
    neuroId: 'visual-stress',
    tagline: 'Comfort-first reading — soft light, calm contrast',
    dailyGoalLabel: 'Visual comfort sessions',
    gradient: 'from-yellow-300/25 via-amber-400/10 to-orange-400/5',
    glow: 'shadow-[0_12px_40px_-12px_rgba(250,204,21,0.3)]',
    chip: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-950/50 dark:text-yellow-200',
  },
  tourettes: {
    neuroId: 'tourettes',
    tagline: 'No rush, no pressure — pause anytime, progress always',
    dailyGoalLabel: 'Flexible-flow activities',
    gradient: 'from-purple-400/20 via-violet-400/10 to-indigo-500/5',
    glow: 'shadow-[0_12px_40px_-12px_rgba(192,132,252,0.35)]',
    chip: 'bg-purple-100 text-purple-900 dark:bg-purple-950/50 dark:text-purple-200',
  },
};

export const NEURO_ACTIVITIES: NeuroActivity[] = [
  // Autism — inspired by visual schedules (Choiceworks, Tiimo), UDL predictability
  {
    id: 'autism-visual-schedule',
    neuroId: 'autism',
    title: 'My Visual Day Map',
    description: 'Drag-and-order 4 picture cards for today — know what comes next',
    durationMinutes: 8,
    category: 'focus',
    icon: LayoutGrid,
    inspiration: 'Visual schedules reduce anxiety (UDL / Tiimo-style)',
    route: ROUTES.AUTISM_SPACE,
    starsReward: 3,
  },
  {
    id: 'autism-social-story',
    neuroId: 'autism',
    title: 'Social Story Studio',
    description: 'Build a 3-panel story about a new situation with calm prompts',
    durationMinutes: 12,
    category: 'social',
    icon: BookOpen,
    inspiration: 'Carol Gray social stories framework',
    route: ROUTES.AUTISM_SPACE,
    starsReward: 4,
  },
  {
    id: 'autism-sensory-break',
    neuroId: 'autism',
    title: 'Sensory Reset Timer',
    description: '5-minute guided break with dim visuals and breathing cues',
    durationMinutes: 5,
    category: 'regulation',
    icon: Wind,
    inspiration: 'Calm Corner regulation (Vedyx-style)',
    route: ROUTES.AUTISM_SPACE,
    starsReward: 2,
  },
  {
    id: 'autism-pronunciation-buddy',
    neuroId: 'autism',
    title: 'Pronunciation Buddy',
    description: 'Practise names, helpful words, and short sentences with listen-and-repeat support',
    durationMinutes: 8,
    category: 'social',
    icon: Mic,
    inspiration: 'Communication confidence with speech, AAC, and mixed communication styles',
    route: ROUTES.PRONUNCIATION_BUDDY,
    starsReward: 3,
  },
  {
    id: 'autism-pattern-calm',
    neuroId: 'autism',
    title: 'Pattern Predictor',
    description: 'Complete visual sequences — same structure, growing challenge',
    durationMinutes: 10,
    category: 'focus',
    icon: Brain,
    inspiration: 'Structured visual learning paths',
    route: ROUTES.AUTISM_SPACE,
    starsReward: 3,
  },

  // ADHD — inspired by Focus@Will, Habitica, movement breaks
  {
    id: 'adhd-focus-sprint',
    neuroId: 'adhd',
    title: 'Focus Sprint 🎯',
    description: 'A short hyper-focus window with one clear micro-goal',
    durationMinutes: 12,
    category: 'focus',
    icon: Timer,
    inspiration: 'Pomodoro + body-doubling research',
    action: 'focus-timer',
    starsReward: 5,
  },
  {
    id: 'adhd-focus-coach',
    neuroId: 'adhd',
    title: 'ADHD Focus Coach',
    description: 'Check energy, choose one tiny first step, get a rescue plan, then send a support insight',
    durationMinutes: 6,
    category: 'focus',
    icon: Brain,
    inspiration: 'Externalized executive function: initiation, movement reset, immediate reinforcement',
    starsReward: 5,
  },
  {
    id: 'adhd-task-breakdown',
    neuroId: 'adhd',
    title: 'Task Breakdown Buddy',
    description: 'Turn one big classroom task into tiny first steps with a support signal',
    durationMinutes: 7,
    category: 'focus',
    icon: BookOpen,
    inspiration: 'Executive-function scaffold: task initiation, sequencing, and reduced overwhelm',
    starsReward: 5,
  },
  {
    id: 'adhd-break-prescription',
    neuroId: 'adhd',
    title: 'Break Prescription',
    description: 'Choose the current state and get the right 60-second reset before returning',
    durationMinutes: 4,
    category: 'regulation',
    icon: Wind,
    inspiration: 'Regulation-matched breaks: movement, quiet, breathing, sensory, or return support',
    starsReward: 4,
  },
  {
    id: 'adhd-movement-burst',
    neuroId: 'adhd',
    title: 'Movement Burst',
    description: '60-second state-matched movement reset with standing and seated choices',
    durationMinutes: 3,
    category: 'motor',
    icon: Zap,
    inspiration: 'Inclusive movement breaks for regulation, activation, and task return',
    starsReward: 2,
  },
  {
    id: 'adhd-quest-chain',
    neuroId: 'adhd',
    title: 'Quest Chain',
    description: 'Turn one goal into 3 sequential tiny wins and keep the unlocked badge',
    durationMinutes: 15,
    category: 'creative',
    icon: Gamepad2,
    inspiration: 'Immediate reinforcement, visible progress, and low-pressure task sequencing',
    starsReward: 6,
  },
  {
    id: 'adhd-mood-check',
    neuroId: 'adhd',
    title: 'Energy Check-In',
    description: 'Rate your battery — app adjusts task length to match',
    durationMinutes: 2,
    category: 'regulation',
    icon: Heart,
    inspiration: 'Energy-aware pacing with shorter demands and predictable recovery time',
    starsReward: 2,
  },

  // Dyslexia — Lexy / Speechify / Orton-Gillingham inspired
  {
    id: 'dyslexia-read-aloud',
    neuroId: 'dyslexia',
    title: 'Read-Aloud Adventure',
    description: 'Follow highlighted words as they are spoken — tap to repeat',
    durationMinutes: 15,
    category: 'literacy',
    icon: Headphones,
    inspiration: 'Speechify-style TTS with tracking',
    starsReward: 4,
  },
  {
    id: 'dyslexia-phonics-trace',
    neuroId: 'dyslexia',
    title: 'Phonics Trace & Say',
    description: 'Trace letter shapes, say sounds aloud — multisensory loop',
    durationMinutes: 10,
    category: 'literacy',
    icon: Hand,
    inspiration: 'Lexy multisensory structured literacy',
    starsReward: 4,
  },
  {
    id: 'dyslexia-overlay-read',
    neuroId: 'dyslexia',
    title: 'Colored Overlay Reader',
    description: 'Short passage with cream/blue overlay and wide line spacing',
    durationMinutes: 12,
    category: 'literacy',
    icon: Eye,
    inspiration: 'Irlen overlay research',
    starsReward: 3,
  },

  // Dysgraphia
  {
    id: 'dysgraphia-voice-story',
    neuroId: 'dysgraphia',
    title: 'Voice Story Builder',
    description: 'Speak your ideas — we turn them into sentences on screen',
    durationMinutes: 12,
    category: 'creative',
    icon: Mic,
    inspiration: 'Speech-to-text writing support',
    action: 'writing',
    route: ROUTES.WRITING_PAD,
    starsReward: 5,
  },
  {
    id: 'dysgraphia-trace-path',
    neuroId: 'dysgraphia',
    title: 'Trace the Path',
    description: 'Follow dotted lines with your finger — build motor memory',
    durationMinutes: 8,
    category: 'motor',
    icon: PenTool,
    inspiration: 'Occupational therapy tracing',
    availability: 'planned',
    availabilityNote: 'A large-target tracing activity with non-drag controls is being built.',
    starsReward: 3,
  },
  {
    id: 'dysgraphia-word-bank',
    neuroId: 'dysgraphia',
    title: 'Word Bank Express',
    description: 'Tap word cards to build sentences — no typing needed',
    durationMinutes: 10,
    category: 'literacy',
    icon: LayoutGrid,
    inspiration: 'Fixed word choices reduce writing friction without scoring expression',
    starsReward: 4,
  },

  // Dyscalculia — TouchMath, Numberblocks inspired
  {
    id: 'dyscalculia-number-line',
    neuroId: 'dyscalculia',
    title: 'Number Line Explorer',
    description: 'Hop along a visual number line — see addition as movement',
    durationMinutes: 12,
    category: 'math',
    icon: LineChart,
    inspiration: 'Connected counters, numerals, and one-unit number-line hops',
    starsReward: 4,
  },
  {
    id: 'dyscalculia-pattern-blocks',
    neuroId: 'dyscalculia',
    title: 'Pattern Block Puzzle',
    description: 'Match shapes to build number patterns — no timed pressure',
    durationMinutes: 10,
    category: 'math',
    icon: Calculator,
    inspiration: 'Concrete-representational-abstract (CRA)',
    availability: 'planned',
    availabilityNote: 'A tested pattern activity is coming next.',
    starsReward: 3,
  },
  {
    id: 'dyscalculia-real-world',
    neuroId: 'dyscalculia',
    title: 'Kitchen Math Story',
    description: 'Measure ingredients in a comic — math with real meaning',
    durationMinutes: 15,
    category: 'math',
    icon: Star,
    inspiration: 'Contextual math (UDL principle)',
    availability: 'planned',
    availabilityNote: 'A tested everyday-maths story is coming next.',
    starsReward: 5,
  },

  // Dyspraxia
  {
    id: 'dyspraxia-fine-motor',
    neuroId: 'dyspraxia',
    title: 'Fine Motor Mission',
    description: 'Practise optional large-target movements with tap and keyboard choices',
    durationMinutes: 10,
    category: 'motor',
    icon: Target,
    inspiration: 'Choice-led practice with accessible alternatives',
    availability: 'planned',
    availabilityNote: 'We are building this without precision scoring or drag-only controls.',
    starsReward: 4,
  },
  {
    id: 'dyspraxia-sequence-steps',
    neuroId: 'dyspraxia',
    title: 'Step-by-Step Planner',
    description: 'Put an everyday task into three clear steps using large controls',
    durationMinutes: 8,
    category: 'motor',
    icon: Calendar,
    inspiration: 'One-step visual sequencing with touch and keyboard controls',
    starsReward: 3,
  },
  {
    id: 'dyspraxia-gross-motor',
    neuroId: 'dyspraxia',
    title: 'Gross Motor Galaxy',
    description: 'Choose seated or standing movement steps at your own pace',
    durationMinutes: 7,
    category: 'motor',
    icon: Sparkles,
    inspiration: 'Choice-led movement with seated alternatives',
    availability: 'planned',
    availabilityNote: 'Movement choices need a reviewed safety flow before launch.',
    starsReward: 3,
  },

  // SPD
  {
    id: 'spd-calm-corner',
    neuroId: 'spd',
    title: 'Calm Corner',
    description: 'Dim lights, soft sounds, breathing orb — regulate before learning',
    durationMinutes: 5,
    category: 'regulation',
    icon: Waves,
    inspiration: 'Sensory diet / Calm Corner (Vedyx)',
    action: 'music',
    route: ROUTES.MUSIC,
    starsReward: 3,
  },
  {
    id: 'spd-sensory-checklist',
    neuroId: 'spd',
    title: 'Sensory Check-In',
    description: 'Choose how sight, sound, touch, and movement feel — then pick a comfort support',
    durationMinutes: 3,
    category: 'regulation',
    icon: Heart,
    inspiration: 'Child-led sensory comfort choices and practical adjustments',
    starsReward: 2,
  },
  {
    id: 'spd-soundscape',
    neuroId: 'spd',
    title: 'Personal Soundscape',
    description: 'Mix rain, lo-fi, or white noise to your comfort level',
    durationMinutes: 10,
    category: 'regulation',
    icon: Music,
    inspiration: 'Auditory regulation tools',
    route: ROUTES.MUSIC,
    starsReward: 2,
  },

  // Auditory processing
  {
    id: 'auditory-caption-match',
    neuroId: 'auditory',
    title: 'Caption Match Game',
    description: 'Watch a short clip — match what you heard to visual cards',
    durationMinutes: 10,
    category: 'literacy',
    icon: Volume2,
    inspiration: 'Visual reinforcement of auditory input',
    availability: 'planned',
    availabilityNote: 'Caption and picture matching are coming next.',
    starsReward: 4,
  },
  {
    id: 'auditory-repeat-back',
    neuroId: 'auditory',
    title: 'Listen & Repeat Buddy',
    description: 'Hear and practise a helpful word or short phrase at your own pace',
    durationMinutes: 8,
    category: 'focus',
    icon: Headphones,
    inspiration: 'Optional listen-and-repeat communication practice',
    route: ROUTES.PRONUNCIATION_BUDDY,
    starsReward: 3,
  },
  {
    id: 'auditory-slow-speech',
    neuroId: 'auditory',
    title: 'Slow & Clear Mode',
    description: 'Instructions at 0.75× speed with bold keyword highlights',
    durationMinutes: 12,
    category: 'literacy',
    icon: Timer,
    inspiration: 'Extended time / clear speech accommodations',
    availability: 'planned',
    availabilityNote: 'Adjustable speech speed and keyword highlighting are coming next.',
    starsReward: 3,
  },

  // Visual stress
  {
    id: 'visual-comfort-read',
    neuroId: 'visual-stress',
    title: 'Comfort Read Session',
    description: 'Sepia theme, large text, reading ruler — 10 calm minutes',
    durationMinutes: 10,
    category: 'literacy',
    icon: Sun,
    inspiration: 'Visual stress / Irlen protocols',
    availability: 'planned',
    availabilityNote: 'A live comfort reader with child-chosen settings is coming next.',
    starsReward: 3,
  },
  {
    id: 'visual-font-lab',
    neuroId: 'visual-stress',
    title: 'Font & Spacing Lab',
    description: 'Try OpenDyslexic, wider lines, and cream background live',
    durationMinutes: 5,
    category: 'literacy',
    icon: Type,
    inspiration: 'Accessible typography (WCAG)',
    availability: 'planned',
    availabilityNote: 'A live typography preview is coming next.',
    starsReward: 2,
  },
  {
    id: 'visual-break-2020',
    neuroId: 'visual-stress',
    title: '20-20-20 Eye Rest',
    description: 'Look 20 feet away for 20 seconds — gentle reminder loop',
    durationMinutes: 4,
    category: 'regulation',
    icon: Eye,
    inspiration: 'Digital eye strain prevention',
    availability: 'planned',
    availabilityNote: 'An optional, pausable reminder is coming next.',
    starsReward: 2,
  },

  // Tourette's
  {
    id: 'tourettes-flex-flow',
    neuroId: 'tourettes',
    title: 'Flex Flow Session',
    description: 'Pause anytime — progress saves automatically, zero countdown',
    durationMinutes: 15,
    category: 'creative',
    icon: Pause,
    inspiration: 'Tic-friendly / PDA-aware design',
    availability: 'planned',
    availabilityNote: 'Pause, autosave, and alternative response controls are coming next.',
    starsReward: 4,
  },
  {
    id: 'tourettes-tic-break',
    neuroId: 'tourettes',
    title: 'Tic Break Pass',
    description: 'Take an official break — no questions, no lost progress',
    durationMinutes: 3,
    category: 'regulation',
    icon: Wind,
    inspiration: 'Compassionate accommodation',
    availability: 'planned',
    availabilityNote: 'A no-questions break pass with saved progress is coming next.',
    starsReward: 2,
  },
  {
    id: 'tourettes-creative-free',
    neuroId: 'tourettes',
    title: 'Voice or Type Freely',
    description: 'Use voice or typing to capture an idea with no timer',
    durationMinutes: 12,
    category: 'creative',
    icon: Palette,
    inspiration: 'Low-demand expression with more than one input method',
    action: 'writing',
    route: ROUTES.WRITING_PAD,
    starsReward: 4,
  },
];

const PRONUNCIATION_NEURO_IDS = new Set(['autism', 'dyslexia', 'auditory']);

const buildPronunciationActivity = (neuroId: string): NeuroActivity => ({
  id: `${neuroId}-pronunciation-buddy`,
  neuroId,
  title: 'Pronunciation Buddy',
  description: 'Practise names, helpful words, and short sentences with listen-and-repeat support',
  durationMinutes: 8,
  category: neuroId === 'dyslexia' || neuroId === 'auditory' ? 'literacy' : 'social',
  icon: Mic,
  inspiration: 'Speech, listening, and AAC-adjacent communication confidence',
  route: ROUTES.PRONUNCIATION_BUDDY,
  starsReward: 3,
});

export const ACCESSIBILITY_TOOLS: NeuroAccessibilityTool[] = [
  { id: 'tool-font-up', neuroIds: ['dyslexia', 'visual-stress', 'adhd'], label: 'Bigger Text', description: 'Increase reading size', icon: Type, action: 'font-up' },
  { id: 'tool-font-down', neuroIds: ['visual-stress'], label: 'Smaller Text', description: 'Reduce visual clutter', icon: Type, action: 'font-down' },
  { id: 'tool-dyslexia', neuroIds: ['dyslexia', 'visual-stress'], label: 'Dyslexia Font', description: 'OpenDyslexic typeface', icon: BookOpen, action: 'dyslexia-font' },
  { id: 'tool-contrast', neuroIds: ['visual-stress', 'autism', 'spd'], label: 'High Contrast', description: 'Sharper text & borders', icon: Eye, action: 'high-contrast' },
  { id: 'tool-sepia', neuroIds: ['visual-stress', 'dyslexia', 'spd'], label: 'Comfort Sepia', description: 'Warm, low-glare theme', icon: Sun, action: 'sepia-theme' },
  { id: 'tool-motion', neuroIds: ['autism', 'spd', 'tourettes'], label: 'Calm Motion', description: 'Reduce animations', icon: Wind, action: 'reduced-motion' },
  { id: 'tool-music', neuroIds: ['spd', 'adhd', 'autism'], label: 'Calm Sounds', description: 'Lo-fi & nature mixes', icon: Music, action: 'music' },
  { id: 'tool-writing', neuroIds: ['dysgraphia', 'dyslexia', 'dyspraxia', 'tourettes'], label: 'Voice Writing', description: 'Speak instead of type', icon: Mic, action: 'writing' },
  { id: 'tool-pronunciation', neuroIds: Array.from(PRONUNCIATION_NEURO_IDS), label: 'Pronounce', description: 'Listen, repeat, practise words', icon: Mic, action: 'pronunciation' },
];

export const NEURO_METRICS: NeuroMetricDefinition[] = [
  { neuroId: 'autism', label: 'Routine streak', unit: 'days', icon: Calendar, dailyTarget: 1 },
  { neuroId: 'adhd', label: 'Focus minutes', unit: 'min', icon: Timer, dailyTarget: 25 },
  { neuroId: 'dyslexia', label: 'Words read', unit: 'words', icon: BookOpen, dailyTarget: 50 },
  { neuroId: 'dysgraphia', label: 'Expressions', unit: 'pieces', icon: PenTool, dailyTarget: 2 },
  { neuroId: 'dyscalculia', label: 'Math answers', unit: 'correct', icon: Calculator, dailyTarget: 3 },
  { neuroId: 'dyspraxia', label: 'Plans practised', unit: 'plans', icon: Target, dailyTarget: 1 },
  { neuroId: 'spd', label: 'Regulation breaks', unit: 'breaks', icon: Waves, dailyTarget: 2 },
  { neuroId: 'auditory', label: 'Listen tasks', unit: 'tasks', icon: Volume2, dailyTarget: 2 },
  { neuroId: 'visual-stress', label: 'Comfort sessions', unit: 'sessions', icon: Sun, dailyTarget: 2 },
  { neuroId: 'tourettes', label: 'Flow sessions', unit: 'sessions', icon: Sparkles, dailyTarget: 1 },
];

/** A daily mission must have an in-place completion path that records real work. */
export function isTrackableDailyActivity(activity: NeuroActivity): boolean {
  if (activity.availability === 'planned' || activity.route) return false;
  return activity.action === undefined
    || activity.action === 'journal'
    || activity.action === 'focus-timer';
}

/** Pick 2 daily activities per neuro (rotates by day of year) */
export function getDailyActivitiesForNeuro(neuroId: string, daySeed = new Date().getDate()): NeuroActivity[] {
  const pool = NEURO_ACTIVITIES.filter(
    (activity) => activity.neuroId === neuroId
      && isTrackableDailyActivity(activity),
  );
  if (!NEURO_ZONE_META[neuroId]) return [];
  if (pool.length === 0) return [];
  const start = daySeed % pool.length;
  const picked = pool.length === 1
    ? [pool[0]]
    : [pool[start], pool[(start + 1) % pool.length]];
  if (neuroId === 'adhd') {
    ['adhd-focus-coach', 'adhd-task-breakdown', 'adhd-break-prescription', 'adhd-mood-check'].forEach((activityId) => {
      if (picked.some((activity) => activity.id === activityId)) return;
      const activity = pool.find((item) => item.id === activityId);
      if (activity) picked.push(activity);
    });
  }
  return picked;
}

/** All profile activities for the expandable zone, including honest coming-next cards. */
export function getAllActivitiesForNeuro(neuroId: string): NeuroActivity[] {
  if (!NEURO_ZONE_META[neuroId]) return [];
  const activities = NEURO_ACTIVITIES.filter((activity) => activity.neuroId === neuroId);
  if (!PRONUNCIATION_NEURO_IDS.has(neuroId)) return activities;
  const pronunciationActivity = buildPronunciationActivity(neuroId);
  return activities.some((activity) => activity.route === ROUTES.PRONUNCIATION_BUDDY)
    ? activities
    : [...activities, pronunciationActivity];
}

export function getActivitiesForNeuros(neuroIds: string[]): NeuroActivity[] {
  const seen = new Set<string>();
  const result: NeuroActivity[] = [];
  neuroIds.forEach((id) => {
    getDailyActivitiesForNeuro(id).forEach((activity) => {
      if (!seen.has(activity.id)) {
        seen.add(activity.id);
        result.push(activity);
      }
    });
  });
  return result;
}

export function getToolsForNeuros(neuroIds: string[]): NeuroAccessibilityTool[] {
  return ACCESSIBILITY_TOOLS.filter((tool) =>
    tool.neuroIds.some((id) => neuroIds.includes(id)),
  );
}

export function getMetricsForNeuros(neuroIds: string[]): NeuroMetricDefinition[] {
  return NEURO_METRICS.filter((m) => neuroIds.includes(m.neuroId));
}
