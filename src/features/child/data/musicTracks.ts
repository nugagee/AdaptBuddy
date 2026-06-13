import type { LucideIcon } from 'lucide-react';
import { Cloud, Music, Sun, Volume2, Waves, Wind } from 'lucide-react';

export interface MusicTrack {
  id: string;
  name: string;
  description: string;
  moods: string[];
  src: string;
  Icon: LucideIcon;
  accent: {
    card: string;
    iconBg: string;
    iconText: string;
    ring: string;
    glow: string;
  };
}

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'rain',
    name: 'Gentle Rain',
    description: 'Soft rainfall for deep focus and quiet calm',
    moods: ['Focus', 'Relax'],
    src: '/music/rain.mp3',
    Icon: Cloud,
    accent: {
      card: 'from-sky-50/90 to-indigo-50/70 dark:from-sky-950/40 dark:to-indigo-950/30',
      iconBg: 'bg-gradient-to-br from-sky-400 to-indigo-500',
      iconText: 'text-white',
      ring: 'ring-sky-400/40',
      glow: 'shadow-[0_0_40px_-8px_rgba(56,189,248,0.45)]',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean Waves',
    description: 'Rhythmic shore sounds that ebb and flow with your breath',
    moods: ['Sleep', 'Calm'],
    src: '/music/ocean.mp3',
    Icon: Waves,
    accent: {
      card: 'from-teal-50/90 to-cyan-50/70 dark:from-teal-950/40 dark:to-cyan-950/30',
      iconBg: 'bg-gradient-to-br from-teal-400 to-cyan-500',
      iconText: 'text-white',
      ring: 'ring-teal-400/40',
      glow: 'shadow-[0_0_40px_-8px_rgba(20,184,166,0.45)]',
    },
  },
  {
    id: 'forest',
    name: 'Forest Night',
    description: 'Crickets and rustling leaves under a peaceful canopy',
    moods: ['Unwind', 'Nature'],
    src: '/music/forest.mp3',
    Icon: Wind,
    accent: {
      card: 'from-emerald-50/90 to-teal-50/70 dark:from-emerald-950/40 dark:to-teal-950/30',
      iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500',
      iconText: 'text-white',
      ring: 'ring-emerald-400/40',
      glow: 'shadow-[0_0_40px_-8px_rgba(52,211,153,0.4)]',
    },
  },
  {
    id: 'lofi',
    name: 'Lofi Beats',
    description: 'Warm, mellow rhythms for study and creative flow',
    moods: ['Study', 'Focus'],
    src: '/music/lofi.mp3',
    Icon: Music,
    accent: {
      card: 'from-violet-50/90 to-indigo-50/70 dark:from-violet-950/40 dark:to-indigo-950/30',
      iconBg: 'bg-gradient-to-br from-violet-500 to-indigo-500',
      iconText: 'text-white',
      ring: 'ring-violet-400/40',
      glow: 'shadow-[0_0_40px_-8px_rgba(139,92,246,0.45)]',
    },
  },
  {
    id: 'white-noise',
    name: 'Soft Hush',
    description: 'Steady ambient tone to soften overwhelming noise',
    moods: ['Sensory', 'Sleep'],
    src: '/music/meditation.mp3',
    Icon: Volume2,
    accent: {
      card: 'from-slate-50/90 to-gray-100/70 dark:from-slate-900/50 dark:to-gray-900/40',
      iconBg: 'bg-gradient-to-br from-slate-400 to-gray-500',
      iconText: 'text-white',
      ring: 'ring-slate-400/40',
      glow: 'shadow-[0_0_40px_-8px_rgba(148,163,184,0.35)]',
    },
  },
  {
    id: 'morning',
    name: 'Morning Birds',
    description: 'Gentle birdsong to ease into a new day',
    moods: ['Morning', 'Uplift'],
    src: '/music/forest.mp3',
    Icon: Sun,
    accent: {
      card: 'from-amber-50/90 to-orange-50/70 dark:from-amber-950/40 dark:to-orange-950/30',
      iconBg: 'bg-gradient-to-br from-amber-400 to-orange-400',
      iconText: 'text-white',
      ring: 'ring-amber-400/40',
      glow: 'shadow-[0_0_40px_-8px_rgba(251,191,36,0.4)]',
    },
  },
];

export const TIMER_PRESETS = [5, 10, 15, 30] as const;

export function getTrackById(trackId: string | null): MusicTrack | undefined {
  return MUSIC_TRACKS.find((track) => track.id === trackId);
}
