import { useCallback, useEffect, useRef, useState } from 'react';
import {
  acquireYouTubePlayer,
  getYouTubePlayer,
  releaseYouTubePlayer,
} from 'services/youtubePlayerSingleton';

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

export interface UseYouTubePlayerOptions {
  videoId: string;
  containerId?: string;
  seekStep?: number;
  /** Ms after mount before autoplay (e.g. 2000 on homepage) */
  autoPlayDelayMs?: number;
  /** Volume used on first load and autoplay */
  initialVolume?: number;
}

export function useYouTubePlayer({
  videoId,
  seekStep = 10,
  autoPlayDelayMs,
  initialVolume = DEFAULT_VOLUME,
}: UseYouTubePlayerOptions) {
  const playerRef = useRef<YT.Player | null>(null);
  const mountTimeRef = useRef<number | null>(null);
  const autoplayTriggeredRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => readStoredVolume(initialVolume));
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let tickId: ReturnType<typeof setInterval> | null = null;

    const startTick = () => {
      if (tickId) return;
      tickId = setInterval(() => {
        const player = playerRef.current ?? getYouTubePlayer();
        if (!player) return;
        try {
          const t = player.getCurrentTime();
          const d = player.getDuration();
          if (Number.isFinite(t)) setCurrentTime(t);
          if (Number.isFinite(d) && d > 0) setDuration(d);
        } catch {
          /* player not ready */
        }
      }, 500);
    };

    const stopTick = () => {
      if (tickId) {
        clearInterval(tickId);
        tickId = null;
      }
    };

    const volumeOnLoad =
      autoPlayDelayMs != null ? initialVolume : readStoredVolume(initialVolume);

    const onReady = (player: YT.Player) => {
      if (cancelled) return;
      playerRef.current = player;
      player.setVolume(volumeOnLoad);
      setVolumeState(volumeOnLoad);
      setReady(true);
    };

    const onStateChange = (player: YT.Player, state: number) => {
      if (cancelled) return;
      playerRef.current = player;
      const isPlaying = state === YT.PlayerState.PLAYING;
      setPlaying(isPlaying);
      if (isPlaying) startTick();
      else stopTick();
    };

    const onError = () => {
      if (!cancelled) setError('Unable to load this stream. Try again later.');
    };

    const handlers = { onReady, onStateChange, onError };

    acquireYouTubePlayer({ videoId, ...handlers }).catch(() => {
      if (!cancelled) setError('Unable to load this stream. Try again later.');
    });

    return () => {
      cancelled = true;
      stopTick();
      releaseYouTubePlayer(handlers);
      playerRef.current = null;
    };
  }, [videoId, initialVolume, autoPlayDelayMs]);

  useEffect(() => {
    if (!autoPlayDelayMs) return undefined;

    if (mountTimeRef.current == null) {
      mountTimeRef.current = Date.now();
    }

    const runAutoplay = () => {
      if (autoplayTriggeredRef.current || !ready) return;
      const player = playerRef.current ?? getYouTubePlayer();
      if (!player) return;

      autoplayTriggeredRef.current = true;
      player.setVolume(initialVolume);
      setVolumeState(initialVolume);
      try {
        localStorage.setItem(VOLUME_STORAGE_KEY, String(initialVolume));
      } catch {
        /* ignore */
      }
      player.unMute();
      setMuted(false);
      player.playVideo();
    };

    const elapsed = Date.now() - (mountTimeRef.current ?? Date.now());
    const delay = Math.max(0, autoPlayDelayMs - elapsed);
    const timeoutId = setTimeout(runAutoplay, delay);

    return () => clearTimeout(timeoutId);
  }, [ready, autoPlayDelayMs, initialVolume]);

  const persistVolume = useCallback((v: number) => {
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, String(v));
    } catch {
      /* ignore */
    }
  }, []);

  const togglePlay = useCallback(() => {
    const player = playerRef.current ?? getYouTubePlayer();
    if (!player || !ready) return;
    if (playing) player.pauseVideo();
    else player.playVideo();
  }, [ready, playing]);

  const seekBy = useCallback(
    (delta: number) => {
      const player = playerRef.current ?? getYouTubePlayer();
      if (!player || !ready) return;
      const next = Math.max(0, player.getCurrentTime() + delta);
      player.seekTo(next, true);
      setCurrentTime(next);
    },
    [ready],
  );

  const seekTo = useCallback(
    (seconds: number) => {
      const player = playerRef.current ?? getYouTubePlayer();
      if (!player || !ready) return;
      const max = duration > 0 ? duration : seconds;
      const clamped = Math.min(max, Math.max(0, seconds));
      player.seekTo(clamped, true);
      setCurrentTime(clamped);
    },
    [ready, duration],
  );

  const setVolume = useCallback(
    (v: number) => {
      const player = playerRef.current ?? getYouTubePlayer();
      const clamped = Math.min(100, Math.max(0, v));
      setVolumeState(clamped);
      persistVolume(clamped);
      if (!player || !ready) return;
      player.setVolume(clamped);
      if (clamped > 0 && muted) {
        player.unMute();
        setMuted(false);
      }
    },
    [ready, muted, persistVolume],
  );

  const toggleMute = useCallback(() => {
    const player = playerRef.current ?? getYouTubePlayer();
    if (!player || !ready) return;
    if (muted) {
      player.unMute();
      setMuted(false);
    } else {
      player.mute();
      setMuted(true);
    }
  }, [ready, muted]);

  const rewind = useCallback(() => seekBy(-seekStep), [seekBy, seekStep]);
  const fastForward = useCallback(() => seekBy(seekStep), [seekBy, seekStep]);

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return {
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
  };
}
