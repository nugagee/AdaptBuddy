import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MUSIC_STREAMS,
  isMobileMusicContext,
  type MusicStream,
} from 'constants/musicStreams';

const VOLUME_STORAGE_KEY = 'adaptbuddy-music-volume';
const DEFAULT_VOLUME = 35;

function readStoredVolume(fallback: number): number {
  try {
    const raw = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (raw == null) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : fallback;
  } catch {
    return fallback;
  }
}

export interface UseAudioPlayerOptions {
  seekStep?: number;
  autoPlayDelayMs?: number;
  initialVolume?: number;
}

export function useAudioPlayer({
  seekStep = 10,
  autoPlayDelayMs,
  initialVolume = DEFAULT_VOLUME,
}: UseAudioPlayerOptions = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mountTimeRef = useRef<number | null>(null);
  const autoplayTriggeredRef = useRef(false);
  const streamIndexRef = useRef(0);
  const switchingRef = useRef(false);
  const readyRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => readStoredVolume(initialVolume));
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamIndex, setStreamIndex] = useState(0);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const currentStream: MusicStream = MUSIC_STREAMS[streamIndex] ?? MUSIC_STREAMS[0];
  const isLive = currentStream.isLive ?? false;

  const applyVolume = useCallback((audio: HTMLAudioElement, volPct: number, isMuted: boolean) => {
    audio.volume = Math.min(1, Math.max(0, volPct / 100));
    audio.muted = isMuted || volPct === 0;
  }, []);

  const loadStreamIntoAudio = useCallback(
    (audio: HTMLAudioElement, stream: MusicStream, volPct: number) => {
      audio.pause();
      audio.src = stream.src;
      audio.load();
      applyVolume(audio, volPct, false);
    },
    [applyVolume],
  );

  const tryNextStreamRef = useRef<() => boolean>(() => false);

  tryNextStreamRef.current = () => {
    if (switchingRef.current) return false;
    const audio = audioRef.current;
    if (!audio) return false;

    const nextIndex = streamIndexRef.current + 1;
    if (nextIndex >= MUSIC_STREAMS.length) return false;

    switchingRef.current = true;
    streamIndexRef.current = nextIndex;
    const next = MUSIC_STREAMS[nextIndex];

    loadStreamIntoAudio(audio, next, volume);
    setStreamIndex(nextIndex);
    setError(null);
    switchingRef.current = false;
    return true;
  };

  const attemptPlay = useCallback(async (): Promise<boolean> => {
    const audio = audioRef.current;
    if (!audio || !readyRef.current) return false;

    applyVolume(audio, volume, muted);

    try {
      await audio.play();
      setPlaying(true);
      setError(null);
      setAutoplayBlocked(false);
      autoplayTriggeredRef.current = true;
      return true;
    } catch {
      setAutoplayBlocked(true);
      return false;
    }
  }, [applyVolume, volume, muted]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audioRef.current = audio;

    const volumeOnLoad =
      autoPlayDelayMs != null ? initialVolume : readStoredVolume(initialVolume);

    loadStreamIntoAudio(audio, MUSIC_STREAMS[0], volumeOnLoad);
    setVolumeState(volumeOnLoad);

    const onLoaded = () => {
      readyRef.current = true;
      setReady(true);
      setError(null);
      const d = audio.duration;
      if (Number.isFinite(d) && d > 0) setDuration(d);
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      const d = audio.duration;
      if (Number.isFinite(d) && d > 0) setDuration(d);
    };

    const onPlay = () => {
      setPlaying(true);
      setError(null);
      setAutoplayBlocked(false);
    };

    const onPause = () => setPlaying(false);

    const onError = () => {
      const switched = tryNextStreamRef.current();
      if (!switched) {
        setError('Unable to load this stream. Try again or pick another station.');
      }
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('canplay', onLoaded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('canplay', onLoaded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
      readyRef.current = false;
    };
  }, [autoPlayDelayMs, initialVolume, loadStreamIntoAudio]);

  useEffect(() => {
    if (!autoPlayDelayMs || !ready) return undefined;

    if (mountTimeRef.current == null) {
      mountTimeRef.current = Date.now();
    }

    const runAutoplay = () => {
      if (autoplayTriggeredRef.current) return;
      void attemptPlay();
    };

    const elapsed = Date.now() - mountTimeRef.current;
    const delay = Math.max(0, autoPlayDelayMs - elapsed);
    const timeoutId = setTimeout(runAutoplay, delay);

    return () => clearTimeout(timeoutId);
  }, [autoPlayDelayMs, attemptPlay, ready]);

  /** Mobile browsers block autoplay until user gesture — unlock on first tap */
  useEffect(() => {
    if (!autoplayBlocked) return undefined;

    const unlock = () => {
      if (!autoplayTriggeredRef.current) {
        void attemptPlay();
      }
    };

    document.addEventListener('pointerdown', unlock, { once: true, passive: true });
    document.addEventListener('touchstart', unlock, { once: true, passive: true });

    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('touchstart', unlock);
    };
  }, [autoplayBlocked, attemptPlay]);

  const persistVolume = useCallback((v: number) => {
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, String(v));
    } catch {
      /* ignore */
    }
  }, []);

  const retryStream = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setError(null);
    streamIndexRef.current = 0;
    setStreamIndex(0);
    autoplayTriggeredRef.current = false;
    setAutoplayBlocked(false);

    loadStreamIntoAudio(audio, MUSIC_STREAMS[0], volume);
    void attemptPlay();
  }, [volume, loadStreamIntoAudio, attemptPlay]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !readyRef.current) return;

    if (playing) {
      audio.pause();
      return;
    }

    if (error) {
      retryStream();
      return;
    }

    void attemptPlay();
  }, [playing, error, attemptPlay, retryStream]);

  const seekBy = useCallback(
    (delta: number) => {
      const audio = audioRef.current;
      if (!audio || !readyRef.current || isLive) return;
      const next = Math.max(0, audio.currentTime + delta);
      audio.currentTime = next;
      setCurrentTime(next);
    },
    [isLive],
  );

  const seekTo = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      if (!audio || !readyRef.current || isLive) return;
      const max = duration > 0 ? duration : seconds;
      const clamped = Math.min(max, Math.max(0, seconds));
      audio.currentTime = clamped;
      setCurrentTime(clamped);
    },
    [duration, isLive],
  );

  const setVolume = useCallback(
    (v: number) => {
      const audio = audioRef.current;
      const clamped = Math.min(100, Math.max(0, v));
      setVolumeState(clamped);
      persistVolume(clamped);
      if (!audio) return;
      const shouldMute = clamped === 0 ? true : muted;
      applyVolume(audio, clamped, shouldMute);
      if (clamped > 0 && muted) {
        setMuted(false);
        audio.muted = false;
      }
    },
    [muted, persistVolume, applyVolume],
  );

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !readyRef.current) return;
    if (muted || volume === 0) {
      audio.muted = false;
      if (volume === 0) {
        setVolumeState(35);
        audio.volume = 0.35;
      }
      setMuted(false);
    } else {
      audio.muted = true;
      setMuted(true);
    }
  }, [muted, volume]);

  const rewind = useCallback(() => seekBy(-seekStep), [seekBy, seekStep]);
  const fastForward = useCallback(() => seekBy(seekStep), [seekBy, seekStep]);

  const progress =
    !isLive && duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return {
    ready,
    playing,
    currentTime,
    duration,
    volume,
    muted,
    error,
    progress,
    currentStream,
    isLive,
    autoplayBlocked,
    isMobile: isMobileMusicContext(),
    retryStream,
    togglePlay,
    rewind,
    fastForward,
    seekTo,
    setVolume,
    toggleMute,
  };
}

/** @deprecated Use useAudioPlayer — kept as alias for existing imports */
export const useYouTubePlayer = useAudioPlayer;
