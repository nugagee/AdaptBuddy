import React from 'react';
import { Pause, Play, Square, Volume2 } from 'lucide-react';
import type { MusicTrack } from 'features/child/data/musicTracks';

interface MusicNowPlayingProps {
  track: MusicTrack;
  isPlaying: boolean;
  volume: number;
  timeRemaining: number | null;
  onTogglePlay: () => void;
  onStop: () => void;
  onVolumeChange: (value: number) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const WAVE_HEIGHTS = [28, 44, 36, 52, 40, 48, 32, 56, 38, 50, 34, 46];

const MusicNowPlaying: React.FC<MusicNowPlayingProps> = ({
  track,
  isPlaying,
  volume,
  timeRemaining,
  onTogglePlay,
  onStop,
  onVolumeChange,
}) => {
  const { Icon, accent } = track;

  return (
    <section
      className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/75 p-5 shadow-card backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/75 sm:p-6"
      aria-label="Now playing"
    >
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl music-glow-pulse ${accent.iconBg} opacity-20`}
        aria-hidden
      />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-lg ${accent.iconBg} ${
              isPlaying ? 'music-breathe' : ''
            }`}
          >
            <Icon className="h-8 w-8 text-white" aria-hidden />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-adapt-indigo/80 dark:text-adapt-cyan">
              Now playing
            </p>
            <h2 className="truncate text-xl font-bold text-adapt-navy dark:text-gray-50">
              {track.name}
            </h2>
            <p className="text-sm text-slate-500 dark:text-gray-400">
              {isPlaying ? 'Let the sound wash over you' : 'Paused — take your time'}
            </p>
            {timeRemaining !== null && timeRemaining > 0 && (
              <p className="mt-1 text-xs font-semibold tabular-nums text-adapt-purple dark:text-adapt-cyan">
                Session ends in {formatTime(timeRemaining)}
              </p>
            )}
          </div>
        </div>

        {isPlaying && (
          <div className="flex h-14 items-end justify-center gap-1 px-2" aria-hidden>
            {WAVE_HEIGHTS.map((height, index) => (
              <span
                key={index}
                className="music-wave-bar w-1.5 rounded-full bg-gradient-to-t from-adapt-indigo to-adapt-cyan opacity-80"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePlay}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-adapt-navy text-white shadow-soft transition hover:bg-adapt-purple dark:bg-adapt-indigo dark:hover:bg-adapt-purple"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" aria-hidden />
              ) : (
                <Play className="h-5 w-5 translate-x-0.5" aria-hidden />
              )}
            </button>
            <button
              type="button"
              onClick={onStop}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/80 text-slate-500 transition hover:text-adapt-navy dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
              aria-label="Stop playback"
            >
              <Square className="h-4 w-4 fill-current" aria-hidden />
            </button>
          </div>

          <div className="flex min-w-[180px] items-center gap-3 rounded-2xl border border-white/60 bg-white/60 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60">
            <Volume2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              style={{ ['--range-progress' as string]: `${volume}%` }}
              className="music-player-range h-1.5 flex-1 cursor-pointer appearance-none"
              aria-label="Volume"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={volume}
            />
            <span className="w-9 text-right text-xs tabular-nums text-slate-500 dark:text-gray-400">
              {volume}%
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MusicNowPlaying;
