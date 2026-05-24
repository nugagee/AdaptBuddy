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
  /** Research-inspired design note (shown subtly in UI) */
  inspiration: string;
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
    | 'writing';
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
    action: 'music',
    starsReward: 2,
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
    starsReward: 3,
  },

  // ADHD — inspired by Focus@Will, Habitica, movement breaks
  {
    id: 'adhd-focus-sprint',
    neuroId: 'adhd',
    title: 'Focus Sprint 🎯',
    description: '12-minute hyper-focus window with one clear micro-goal',
    durationMinutes: 12,
    category: 'focus',
    icon: Timer,
    inspiration: 'Pomodoro + body-doubling research',
    action: 'focus-timer',
    starsReward: 5,
  },
  {
    id: 'adhd-movement-burst',
    neuroId: 'adhd',
    title: 'Movement Burst',
    description: '60-second energizer: jump, stretch, spin — then back to task',
    durationMinutes: 3,
    category: 'motor',
    icon: Zap,
    inspiration: 'Exercise breaks improve ADHD focus (CDC)',
    starsReward: 2,
  },
  {
    id: 'adhd-quest-chain',
    neuroId: 'adhd',
    title: 'Quest Chain',
    description: '3 tiny wins in a row — unlock a badge when the chain completes',
    durationMinutes: 15,
    category: 'creative',
    icon: Gamepad2,
    inspiration: 'Gamification (Habitica-style)',
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
    inspiration: 'Mood-adaptive pacing (Vedyx Leap)',
    action: 'journal',
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
    route: ROUTES.WRITING_PAD,
    starsReward: 3,
  },
  {
    id: 'dysgraphia-word-bank',
    neuroId: 'dysgraphia',
    title: 'Word Bank Express',
    description: 'Tap picture tiles to build sentences — no typing needed',
    durationMinutes: 10,
    category: 'literacy',
    icon: LayoutGrid,
    inspiration: 'AAC grid communication (SelectSpeak-style)',
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
    inspiration: 'Visual math manipulatives (TouchMath)',
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
    starsReward: 5,
  },

  // Dyspraxia
  {
    id: 'dyspraxia-fine-motor',
    neuroId: 'dyspraxia',
    title: 'Fine Motor Mission',
    description: 'Pinch, tap, and trace — graded precision challenges',
    durationMinutes: 10,
    category: 'motor',
    icon: Target,
    inspiration: 'OT fine motor grading',
    route: ROUTES.WRITING_PAD,
    starsReward: 4,
  },
  {
    id: 'dyspraxia-sequence-steps',
    neuroId: 'dyspraxia',
    title: 'Step-by-Step Planner',
    description: 'Break a task into 3 motor steps with picture cues',
    durationMinutes: 8,
    category: 'motor',
    icon: Calendar,
    inspiration: 'Motor planning scaffolding',
    starsReward: 3,
  },
  {
    id: 'dyspraxia-gross-motor',
    neuroId: 'dyspraxia',
    title: 'Gross Motor Galaxy',
    description: 'Balance, reach, and cross-body moves in a fun sequence',
    durationMinutes: 7,
    category: 'motor',
    icon: Sparkles,
    inspiration: 'Integrated movement breaks',
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
    description: 'Rate sight, sound, touch, movement — get a tailored break tip',
    durationMinutes: 3,
    category: 'regulation',
    icon: Heart,
    inspiration: 'Sensory profile assessment',
    action: 'journal',
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
    starsReward: 4,
  },
  {
    id: 'auditory-repeat-back',
    neuroId: 'auditory',
    title: 'Repeat & Visualize',
    description: 'Hear a phrase, tap the picture that matches — no rush',
    durationMinutes: 8,
    category: 'focus',
    icon: Headphones,
    inspiration: 'Auditory closure exercises',
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
    action: 'music',
    starsReward: 2,
  },
  {
    id: 'tourettes-creative-free',
    neuroId: 'tourettes',
    title: 'Free Create Zone',
    description: 'Draw, doodle, or voice-note with no rules or timers',
    durationMinutes: 12,
    category: 'creative',
    icon: Palette,
    inspiration: 'Low-demand recovery activities',
    action: 'writing',
    route: ROUTES.WRITING_PAD,
    starsReward: 4,
  },
];

export const ACCESSIBILITY_TOOLS: NeuroAccessibilityTool[] = [
  { id: 'tool-font-up', neuroIds: ['dyslexia', 'visual-stress', 'adhd'], label: 'Bigger Text', description: 'Increase reading size', icon: Type, action: 'font-up' },
  { id: 'tool-font-down', neuroIds: ['visual-stress'], label: 'Smaller Text', description: 'Reduce visual clutter', icon: Type, action: 'font-down' },
  { id: 'tool-dyslexia', neuroIds: ['dyslexia', 'visual-stress'], label: 'Dyslexia Font', description: 'OpenDyslexic typeface', icon: BookOpen, action: 'dyslexia-font' },
  { id: 'tool-contrast', neuroIds: ['visual-stress', 'autism', 'spd'], label: 'High Contrast', description: 'Sharper text & borders', icon: Eye, action: 'high-contrast' },
  { id: 'tool-sepia', neuroIds: ['visual-stress', 'dyslexia', 'spd'], label: 'Comfort Sepia', description: 'Warm, low-glare theme', icon: Sun, action: 'sepia-theme' },
  { id: 'tool-motion', neuroIds: ['autism', 'spd', 'tourettes'], label: 'Calm Motion', description: 'Reduce animations', icon: Wind, action: 'reduced-motion' },
  { id: 'tool-music', neuroIds: ['spd', 'adhd', 'autism'], label: 'Calm Sounds', description: 'Lo-fi & nature mixes', icon: Music, action: 'music' },
  { id: 'tool-writing', neuroIds: ['dysgraphia', 'dyslexia', 'tourettes'], label: 'Voice Writing', description: 'Speak instead of type', icon: Mic, action: 'writing' },
];

export const NEURO_METRICS: NeuroMetricDefinition[] = [
  { neuroId: 'autism', label: 'Routine streak', unit: 'days', icon: Calendar, dailyTarget: 1 },
  { neuroId: 'adhd', label: 'Focus minutes', unit: 'min', icon: Timer, dailyTarget: 25 },
  { neuroId: 'dyslexia', label: 'Words read', unit: 'words', icon: BookOpen, dailyTarget: 50 },
  { neuroId: 'dysgraphia', label: 'Expressions', unit: 'pieces', icon: PenTool, dailyTarget: 2 },
  { neuroId: 'dyscalculia', label: 'Math puzzles', unit: 'solved', icon: Calculator, dailyTarget: 3 },
  { neuroId: 'dyspraxia', label: 'Motor reps', unit: 'reps', icon: Target, dailyTarget: 5 },
  { neuroId: 'spd', label: 'Regulation breaks', unit: 'breaks', icon: Waves, dailyTarget: 2 },
  { neuroId: 'auditory', label: 'Listen tasks', unit: 'tasks', icon: Volume2, dailyTarget: 2 },
  { neuroId: 'visual-stress', label: 'Comfort sessions', unit: 'sessions', icon: Sun, dailyTarget: 2 },
  { neuroId: 'tourettes', label: 'Flow sessions', unit: 'sessions', icon: Sparkles, dailyTarget: 1 },
];

/** Pick 2 daily activities per neuro (rotates by day of year) */
export function getDailyActivitiesForNeuro(neuroId: string, daySeed = new Date().getDate()): NeuroActivity[] {
  const pool = NEURO_ACTIVITIES.filter((a) => a.neuroId === neuroId);
  if (pool.length === 0) return [];
  const start = daySeed % pool.length;
  const picked = [pool[start], pool[(start + 1) % pool.length]];
  return picked;
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
