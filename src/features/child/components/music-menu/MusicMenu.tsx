import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Headphones, Sparkles, Timer, Waves } from 'lucide-react';
import ChildDashboardNavbar from 'features/child/components/layout/ChildDashboardNavbar';
import {
  getTrackById,
  MUSIC_TRACKS,
  TIMER_PRESETS,
  type MusicTrack,
} from 'features/child/data/musicTracks';
import { useAuth } from 'hooks/useAuth';
import { useMusicPlayer } from 'contexts/musicPlayerContext';
import MusicNowPlaying from './MusicNowPlaying';
import SoundscapeCard from './SoundscapeCard';
import './music-menu.css';

const MusicMenu: React.FC = () => {
  const { profile } = useAuth();
  const { beginSoundscapeOverride, endSoundscapeOverride } = useMusicPlayer();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [volume, setVolume] = useState(55);
  const [playbackError, setPlaybackError] = useState('');
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [activeTimerPreset, setActiveTimerPreset] = useState<number | null>(null);
  const [showSensoryTip, setShowSensoryTip] = useState(false);
  const [dismissedSensoryTip, setDismissedSensoryTip] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = getTrackById(currentTrackId);
  const firstName = profile?.first_name || 'Friend';

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  useEffect(() => {
    const neuroTypes = profile?.neuro_types ?? [];
    if (neuroTypes.includes('spd') && !dismissedSensoryTip) {
      const timer = window.setTimeout(() => setShowSensoryTip(true), 1200);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [profile?.neuro_types, dismissedSensoryTip]);

  const playTrack = useCallback(
    async (track: MusicTrack) => {
      setPlaybackError('');

      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.loop = true;
        audioRef.current.preload = 'auto';
        audioRef.current.addEventListener('ended', () => setIsPlaying(false));
        audioRef.current.addEventListener('error', () => {
          setIsPlaying(false);
          setPlaybackError('This sound could not load. Please try another calming sound.');
        });
      }

      const audio = audioRef.current;
      const sourceChanged = audio.src !== new URL(track.src, window.location.origin).href;

      if (sourceChanged) {
        audio.pause();
        audio.src = track.src;
        audio.load();
      }

      audio.volume = Math.min(1, Math.max(0, volume / 100));

      try {
        await audio.play();
        setCurrentTrackId(track.id);
        setIsPlaying(true);
        beginSoundscapeOverride();
      } catch {
        setIsPlaying(false);
        setPlaybackError('Tap play again if your browser blocked the sound.');
      }
    },
    [volume, beginSoundscapeOverride],
  );

  const pauseTrack = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
    endSoundscapeOverride();
  }, [endSoundscapeOverride]);

  const toggleTrack = useCallback(
    (trackId: string) => {
      const track = getTrackById(trackId);
      if (!track) return;

      if (currentTrackId === trackId && isPlaying) {
        pauseTrack();
        return;
      }

      void playTrack(track);
    },
    [currentTrackId, isPlaying, pauseTrack, playTrack],
  );

  const stopAll = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTrackId(null);
    endSoundscapeOverride();
  }, [endSoundscapeOverride]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.min(1, Math.max(0, volume / 100));
    }
  }, [volume]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
      endSoundscapeOverride();
    },
    [endSoundscapeOverride],
  );

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) {
      if (timeRemaining === 0) {
        stopAll();
        setActiveTimerPreset(null);
      }
      return undefined;
    }

    const interval = window.setInterval(() => {
      setTimeRemaining((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timeRemaining, stopAll]);

  const handleSensorySuggestion = () => {
    setDismissedSensoryTip(true);
    setShowSensoryTip(false);
    void playTrack(getTrackById('rain')!);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/40 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 sepia:from-amber-50 sepia:via-amber-50/90 sepia:to-amber-100/60">
      <div
        className="pointer-events-none absolute -left-24 top-32 h-72 w-72 rounded-full bg-adapt-indigo/15 blur-3xl animate-auth-neon-drift"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 top-64 h-64 w-64 rounded-full bg-adapt-teal/15 blur-3xl animate-auth-neon-drift-slow"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-32 left-1/3 h-56 w-56 rounded-full bg-adapt-cyan/10 blur-3xl animate-auth-neon-pulse"
        aria-hidden
      />

      <ChildDashboardNavbar />

      <main className="relative mx-auto max-w-6xl space-y-8 px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-adapt-indigo/10 via-white/85 to-adapt-teal/10 p-6 shadow-card backdrop-blur-sm dark:border-white/10 dark:from-adapt-indigo/20 dark:via-gray-900/90 dark:to-adapt-teal/10 sm:p-8">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-adapt-cyan/20 blur-2xl" aria-hidden />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-adapt-indigo/80 dark:text-adapt-cyan">
                {greeting}, {firstName}
              </p>
              <h1 className="mt-2 text-3xl font-extrabold leading-tight text-adapt-navy dark:text-gray-50 sm:text-4xl">
                Your calm{' '}
                <span className="bg-gradient-to-r from-adapt-indigo to-adapt-teal bg-clip-text text-transparent">
                  soundscape
                </span>
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-gray-400 sm:text-base">
                Gentle loops to help you focus, unwind, or drift into rest. Pick a sound,
                breathe, and let the noise fade away.
              </p>
            </div>

            <div className="music-orb-float flex shrink-0 items-center justify-center">
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-white/70 bg-white/50 shadow-glow backdrop-blur-md dark:border-gray-700 dark:bg-gray-800/50">
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-adapt-indigo/20 to-adapt-teal/20 music-breathe" />
                <Waves className="relative h-10 w-10 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
              </div>
            </div>
          </div>
        </section>

        {showSensoryTip && (
          <div
            className="animate-theme-hint-down flex flex-col gap-3 rounded-2xl border border-sky-200/80 bg-sky-50/90 p-4 shadow-soft dark:border-sky-900/50 dark:bg-sky-950/30 sm:flex-row sm:items-center sm:justify-between"
            role="status"
          >
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" aria-hidden />
              <p className="text-sm text-sky-900 dark:text-sky-100">
                Gentle sounds can help when the world feels loud. Try{' '}
                <span className="font-semibold">Gentle Rain</span> — a soft place to start.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSensorySuggestion}
                className="rounded-full bg-adapt-navy px-4 py-2 text-xs font-semibold text-white transition hover:bg-adapt-purple dark:bg-adapt-indigo"
              >
                Try Gentle Rain
              </button>
              <button
                type="button"
                onClick={() => {
                  setDismissedSensoryTip(true);
                  setShowSensoryTip(false);
                }}
                className="rounded-full border border-sky-200 px-4 py-2 text-xs font-semibold text-sky-700 transition hover:bg-white/80 dark:border-sky-800 dark:text-sky-200"
              >
                Not now
              </button>
            </div>
          </div>
        )}

        {/* Relax timer */}
        <section
          className="rounded-[1.75rem] border border-white/60 bg-white/60 p-5 backdrop-blur-sm dark:border-white/10 dark:bg-gray-900/50"
          aria-label="Relaxation timer"
        >
          <div className="mb-4 flex items-center gap-2">
            <Timer className="h-4 w-4 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
            <h2 className="text-sm font-bold text-adapt-navy dark:text-gray-100">
              Session timer
            </h2>
            <span className="text-xs text-slate-500 dark:text-gray-400">
              — sounds fade when time is up
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {TIMER_PRESETS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => {
                    setActiveTimerPreset(minutes);
                    setTimeRemaining(minutes * 60);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeTimerPreset === minutes
                      ? 'bg-adapt-navy text-white shadow-soft dark:bg-adapt-indigo'
                      : 'border border-white/80 bg-white/80 text-slate-600 hover:border-adapt-indigo/30 hover:text-adapt-navy dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:text-gray-100'
                  }`}
                >
                  {minutes} min
                </button>
              ))}
            <button
              type="button"
              onClick={() => {
                setActiveTimerPreset(null);
                setTimeRemaining(null);
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTimerPreset === null
                  ? 'bg-adapt-indigo/15 text-adapt-indigo dark:bg-adapt-cyan/15 dark:text-adapt-cyan'
                  : 'border border-white/80 bg-white/80 text-slate-600 hover:text-adapt-navy dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300'
              }`}
            >
              No timer
            </button>
          </div>
        </section>

        {currentTrack && (
          <MusicNowPlaying
            track={currentTrack}
            isPlaying={isPlaying}
            volume={volume}
            timeRemaining={timeRemaining}
            onTogglePlay={() => {
              if (isPlaying) {
                pauseTrack();
              } else {
                void playTrack(currentTrack);
              }
            }}
            onStop={stopAll}
            onVolumeChange={setVolume}
          />
        )}

        {playbackError && (
          <p
            className="rounded-2xl border border-red-200/80 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
            role="alert"
          >
            {playbackError}
          </p>
        )}

        {/* Soundscape grid */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-adapt-indigo/10 dark:bg-adapt-cyan/10">
              <Headphones className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-bold text-adapt-navy dark:text-gray-100">
                Choose your soundscape
              </h2>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                Tap any card to play — sounds loop softly until you pause
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {MUSIC_TRACKS.map((track) => (
              <SoundscapeCard
                key={track.id}
                track={track}
                isActive={currentTrackId === track.id}
                isPlaying={currentTrackId === track.id && isPlaying}
                onSelect={() => toggleTrack(track.id)}
              />
            ))}
          </div>
        </section>

        <footer className="rounded-2xl border border-dashed border-adapt-indigo/20 bg-adapt-indigo/5 px-5 py-4 text-center dark:border-adapt-cyan/20 dark:bg-adapt-cyan/5">
          <p className="text-sm text-slate-600 dark:text-gray-400">
            <Headphones className="mr-1.5 inline h-4 w-4 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
            Headphones work best for a cocoon of calm · Perfect for sensory breaks, focus, and bedtime
          </p>
        </footer>
      </main>
    </div>
  );
};

export default MusicMenu;
