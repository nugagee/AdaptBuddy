import React from 'react';
import { Pause, Play } from 'lucide-react';
import type { MusicTrack } from 'features/child/data/musicTracks';

interface SoundscapeCardProps {
  track: MusicTrack;
  isActive: boolean;
  isPlaying: boolean;
  onSelect: () => void;
}

const SoundscapeCard: React.FC<SoundscapeCardProps> = ({
  track,
  isActive,
  isPlaying,
  onSelect,
}) => {
  const { Icon, accent } = track;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      aria-label={`${isActive && isPlaying ? 'Pause' : 'Play'} ${track.name}`}
      className={`group relative flex w-full flex-col overflow-hidden rounded-[1.75rem] border border-white/70 bg-gradient-to-br p-5 text-left shadow-soft backdrop-blur-sm transition-all duration-500 hover:-translate-y-0.5 hover:shadow-card dark:border-white/10 sm:p-6 ${
        accent.card
      } ${
        isActive
          ? `ring-2 ${accent.ring} ${accent.glow} scale-[1.01]`
          : 'hover:border-adapt-indigo/25 dark:hover:border-adapt-cyan/20'
      }`}
    >
      {isActive && isPlaying && (
        <span
          className="absolute right-4 top-4 flex h-2.5 w-2.5 items-center justify-center"
          aria-hidden
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      )}

      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-md transition-transform duration-500 group-hover:scale-105 ${accent.iconBg}`}
        >
          <Icon className={`h-7 w-7 ${accent.iconText}`} aria-hidden />
        </div>

        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/60 bg-white/80 text-adapt-navy shadow-sm transition-all duration-300 dark:border-gray-700 dark:bg-gray-800/90 dark:text-gray-100 ${
            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          aria-hidden
        >
          {isActive && isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 translate-x-0.5" />
          )}
        </span>
      </div>

      <h3 className="mt-5 text-lg font-bold text-adapt-navy dark:text-gray-50">
        {track.name}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-gray-400">
        {track.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {track.moods.map((mood) => (
          <span
            key={mood}
            className="rounded-full border border-white/70 bg-white/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-400"
          >
            {mood}
          </span>
        ))}
        <span className="rounded-full border border-white/70 bg-white/60 px-2.5 py-1 text-[11px] font-semibold text-adapt-indigo/80 dark:border-gray-700 dark:bg-gray-800/70 dark:text-adapt-cyan">
          ∞ Loop
        </span>
      </div>

      {isActive && (
        <p className="mt-4 text-xs font-semibold text-adapt-indigo dark:text-adapt-cyan">
          {isPlaying ? 'Now playing — tap to pause' : 'Paused — tap to resume'}
        </p>
      )}
    </button>
  );
};

export default SoundscapeCard;
