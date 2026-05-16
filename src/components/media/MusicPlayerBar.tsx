import React, { useEffect, useId, useState } from 'react';
import {
  FastForward,
  Music2,
  Pause,
  Play,
  Rewind,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { LOFI_STREAM_VIDEO_ID, useMusicPlayer } from 'contexts/MusicPlayerContext';

const STREAM_URL = `https://youtu.be/${LOFI_STREAM_VIDEO_ID}`;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const MusicPlayerBar: React.FC = () => {
  const progressId = useId();
  const volumeId = useId();

  const {
    ready,
    playing,
    currentTime,
    duration,
    volume,
    muted,
    error,
    progress,
    togglePlay,
    rewind,
    fastForward,
    seekTo,
    setVolume,
    toggleMute,
    expandPlayer,
  } = useMusicPlayer();

  const displayVolume = muted ? 0 : volume;
  const canSeek = duration > 0;
  const [showAutoplayHint, setShowAutoplayHint] = useState(false);

  useEffect(() => {
    if (!ready || playing) {
      setShowAutoplayHint(false);
      return undefined;
    }
    const t = setTimeout(() => setShowAutoplayHint(true), 4500);
    return () => clearTimeout(t);
  }, [ready, playing]);

  return (
    <div
      className="border-t border-white/50 bg-white/85 px-3 py-3 shadow-[0_-8px_32px_-8px_rgba(45,38,84,0.12)] backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/90 sepia:border-amber-200/50 sepia:bg-amber-50/90 sm:px-4"
      role="region"
      aria-label="Background music player"
      onPointerDown={expandPlayer}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden w-10 shrink-0 text-right text-[10px] tabular-nums text-slate-500 sm:block dark:text-gray-400">
            {formatTime(currentTime)}
          </span>
          <input
            id={progressId}
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={canSeek ? progress : 0}
            disabled={!ready || !canSeek}
            onChange={(e) => {
              if (!canSeek) return;
              const pct = Number(e.target.value) / 100;
              seekTo(pct * duration);
            }}
            style={{ ['--range-progress' as string]: `${canSeek ? progress : 0}%` }}
            className="music-player-range h-1.5 flex-1 cursor-pointer appearance-none disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Playback position"
            aria-valuemin={0}
            aria-valuemax={duration || 100}
            aria-valuenow={currentTime}
          />
          <span className="hidden w-10 shrink-0 text-[10px] tabular-nums text-slate-500 sm:block dark:text-gray-400">
            {canSeek ? formatTime(duration) : 'LIVE'}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-[40%]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-adapt-mist text-adapt-purple dark:bg-gray-800 dark:text-adapt-cyan sepia:bg-amber-100">
              <Music2 className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-adapt-navy dark:text-gray-100 sepia:text-amber-950">
                Lofi focus radio
              </p>
              <a
                href={STREAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-xs text-slate-500 transition-colors duration-300 hover:text-neuro-blue dark:text-gray-400 dark:hover:text-adapt-cyan"
              >
                Stream on YouTube
              </a>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={rewind}
              disabled={!ready}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors duration-300 hover:bg-adapt-mist hover:text-neuro-blue disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-adapt-cyan"
              aria-label="Rewind 10 seconds"
            >
              <Rewind className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              disabled={!ready || !!error}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-adapt-navy text-white shadow-soft transition hover:bg-adapt-purple disabled:opacity-50 dark:bg-adapt-indigo dark:hover:bg-adapt-purple"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? (
                <Pause className="h-5 w-5" aria-hidden />
              ) : (
                <Play className="h-5 w-5 translate-x-0.5" aria-hidden />
              )}
            </button>
            <button
              type="button"
              onClick={fastForward}
              disabled={!ready}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors duration-300 hover:bg-adapt-mist hover:text-neuro-blue disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-adapt-cyan"
              aria-label="Fast forward 10 seconds"
            >
              <FastForward className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 sm:min-w-[140px]">
            <button
              type="button"
              onClick={toggleMute}
              disabled={!ready}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition-colors duration-300 hover:bg-adapt-mist hover:text-neuro-blue disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-adapt-cyan"
              aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}
            >
              {muted || volume === 0 ? (
                <VolumeX className="h-5 w-5" aria-hidden />
              ) : (
                <Volume2 className="h-5 w-5" aria-hidden />
              )}
            </button>
            <input
              id={volumeId}
              type="range"
              min={0}
              max={100}
              value={displayVolume}
              disabled={!ready}
              onChange={(e) => setVolume(Number(e.target.value))}
              style={{ ['--range-progress' as string]: `${displayVolume}%` }}
              className="music-player-range h-1.5 w-16 min-w-0 flex-1 cursor-pointer appearance-none sm:w-20 md:w-24"
              aria-label="Volume"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={displayVolume}
            />
            <span className="hidden w-8 text-right text-xs tabular-nums text-slate-500 md:inline dark:text-gray-400">
              {displayVolume}%
            </span>
          </div>
        </div>

        {error && (
          <p className="text-center text-xs text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        {showAutoplayHint && !playing && ready && !error && (
          <p className="text-center text-[11px] text-slate-500 dark:text-gray-400">
            Tap play if music did not start — some browsers block autoplay.
          </p>
        )}
      </div>
    </div>
  );
};

export default MusicPlayerBar;
