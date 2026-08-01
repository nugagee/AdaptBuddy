import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GLOBAL_MUSIC_DEFAULT_VOLUME,
  GLOBAL_YOUTUBE_LIVE_VIDEO_ID,
  GLOBAL_YOUTUBE_STREAM,
  isMobileMusicContext,
} from 'constants/musicStreams';
import type { YouTubePlayerHandlers } from 'services/youtubePlayerSingleton';
import {
  acquireYouTubePlayer,
  getYouTubePlayer,
  releaseYouTubePlayer,
  resetYouTubePlayerForRetry,
} from 'services/youtubePlayerSingleton';

const VOLUME_STORAGE_KEY = 'adaptbuddy-music-volume';
const YOUTUBE_INIT_TIMEOUT_MS = 10_000;

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

export interface UseYouTubeMusicPlayerOptions {
  videoId?: string;
  seekStep?: number;
  autoPlayDelayMs?: number;
  initialVolume?: number;
}

export function useYouTubeMusicPlayer({
  videoId = GLOBAL_YOUTUBE_LIVE_VIDEO_ID,
  seekStep = 10,
  autoPlayDelayMs,
  initialVolume = GLOBAL_MUSIC_DEFAULT_VOLUME,
}: UseYouTubeMusicPlayerOptions = {}) {
  const readyRef = useRef(false);
  const autoplayScheduledRef = useRef(false);
  const timePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handlersRef = useRef<YouTubePlayerHandlers>({});

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() =>
    autoPlayDelayMs != null ? initialVolume : readStoredVolume(initialVolume),
  );
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [initTimedOut, setInitTimedOut] = useState(false);
  const [loading, setLoading] = useState(true);

  const currentStream = GLOBAL_YOUTUBE_STREAM;
  const isLive = true;
  const shouldFallback = Boolean(error) || initTimedOut;

  const syncTimeFromPlayer = useCallback(() => {
    const player = getYouTubePlayer();
    if (!player || !readyRef.current) return;

    try {
      const t = player.getCurrentTime();
      const d = player.getDuration();
      if (Number.isFinite(t) && t >= 0) setCurrentTime(t);
      if (Number.isFinite(d) && d > 0) setDuration(d);
    } catch {
      /* ignore */
    }
  }, []);

  const applyVolumeToPlayer = useCallback((volPct: number, isMuted: boolean) => {
    const player = getYouTubePlayer();
    if (!player || !readyRef.current) return;

    try {
      if (isMuted || volPct === 0) {
        player.mute();
      } else {
        player.unMute();
        player.setVolume(Math.min(100, Math.max(0, volPct)));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const attemptPlay = useCallback((): boolean => {
    const player = getYouTubePlayer();
    if (!player || !readyRef.current) return false;

    applyVolumeToPlayer(volume, muted);

    try {
      player.playVideo();
      setAutoplayBlocked(false);
      return true;
    } catch {
      setAutoplayBlocked(true);
      return false;
    }
  }, [applyVolumeToPlayer, volume, muted]);

  const handleReady = useCallback(
    (player: YT.Player) => {
      readyRef.current = true;
      setReady(true);
      setLoading(false);
      setInitTimedOut(false);
      setError(null);
      applyVolumeToPlayer(volume, muted);
      syncTimeFromPlayer();

      try {
        const state = player.getPlayerState();
        setPlaying(
          state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING,
        );
      } catch {
        /* ignore */
      }
    },
    [applyVolumeToPlayer, volume, muted, syncTimeFromPlayer],
  );

  const handleStateChange = useCallback(
    (_player: YT.Player, state: number) => {
      setPlaying(state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING);
      syncTimeFromPlayer();

      if (state === YT.PlayerState.PLAYING) {
        setError(null);
        setAutoplayBlocked(false);
      }
    },
    [syncTimeFromPlayer],
  );

  const handleError = useCallback((code: number) => {
    setLoading(false);
    setError(
      code === 101 || code === 150
        ? 'This live stream cannot be embedded here — switching to ambient audio.'
        : `Unable to load the live stream (error ${code}).`,
    );
    setPlaying(false);
  }, []);

  handlersRef.current = {
    onReady: handleReady,
    onStateChange: handleStateChange,
    onError: handleError,
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setInitTimedOut(false);
    readyRef.current = false;
    setReady(false);

    const handlers: YouTubePlayerHandlers = {
      onReady: (player) => {
        if (!cancelled) handleReady(player);
      },
      onStateChange: (player, state) => {
        if (!cancelled) handleStateChange(player, state);
      },
      onError: (code) => {
        if (!cancelled) handleError(code);
      },
    };

    void acquireYouTubePlayer({ videoId, ...handlers }).catch(() => {
      if (!cancelled) {
        setLoading(false);
        setError('Unable to load the live stream. Using ambient audio instead.');
      }
    });

    const timeoutId = window.setTimeout(() => {
      if (cancelled || readyRef.current) return;
      setInitTimedOut(true);
      setLoading(false);
    }, YOUTUBE_INIT_TIMEOUT_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      releaseYouTubePlayer(handlers);
      readyRef.current = false;
    };
  }, [videoId, handleReady, handleStateChange, handleError]);

  useEffect(() => {
    if (!ready || !playing) {
      if (timePollRef.current) {
        clearInterval(timePollRef.current);
        timePollRef.current = null;
      }
      return undefined;
    }

    timePollRef.current = setInterval(syncTimeFromPlayer, 1000);
    return () => {
      if (timePollRef.current) {
        clearInterval(timePollRef.current);
        timePollRef.current = null;
      }
    };
  }, [ready, playing, syncTimeFromPlayer]);

  useEffect(() => {
    if (!autoPlayDelayMs || !ready || shouldFallback) {
      autoplayScheduledRef.current = false;
      return undefined;
    }

    autoplayScheduledRef.current = false;
    const timeoutId = setTimeout(() => {
      if (autoplayScheduledRef.current) return;
      autoplayScheduledRef.current = true;

      const player = getYouTubePlayer();
      if (!player || !readyRef.current) return;

      try {
        const state = player.getPlayerState();
        if (state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING) {
          return;
        }
      } catch {
        /* continue */
      }

      attemptPlay();
    }, autoPlayDelayMs);

    return () => clearTimeout(timeoutId);
  }, [autoPlayDelayMs, ready, attemptPlay, shouldFallback]);

  useEffect(() => {
    if (!autoplayBlocked || shouldFallback) return undefined;

    const unlock = () => {
      attemptPlay();
    };

    document.addEventListener('pointerdown', unlock, { once: true, passive: true });
    document.addEventListener('touchstart', unlock, { once: true, passive: true });

    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('touchstart', unlock);
    };
  }, [autoplayBlocked, attemptPlay, shouldFallback]);

  useEffect(() => {
    if (ready) applyVolumeToPlayer(volume, muted);
  }, [volume, muted, applyVolumeToPlayer, ready]);

  const persistVolume = useCallback((v: number) => {
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, String(v));
    } catch {
      /* ignore */
    }
  }, []);

  const retryStream = useCallback(() => {
    setError(null);
    setInitTimedOut(false);
    setAutoplayBlocked(false);
    setLoading(true);
    autoplayScheduledRef.current = false;
    readyRef.current = false;
    setReady(false);

    void resetYouTubePlayerForRetry(videoId)
      .then((player) => {
        handleReady(player);
        applyVolumeToPlayer(volume, muted);
        attemptPlay();
      })
      .catch(() => {
        setLoading(false);
        setError('Unable to load the live stream. Using ambient audio instead.');
      });
  }, [videoId, handleReady, applyVolumeToPlayer, volume, muted, attemptPlay]);

  const togglePlay = useCallback(() => {
    const player = getYouTubePlayer();
    if (!player || !readyRef.current) {
      if (error || initTimedOut) retryStream();
      return;
    }

    if (playing) {
      player.pauseVideo();
      return;
    }

    if (error) {
      retryStream();
      return;
    }

    attemptPlay();
  }, [playing, error, initTimedOut, attemptPlay, retryStream]);

  const pausePlayback = useCallback(() => {
    const player = getYouTubePlayer();
    if (!player || !readyRef.current) return;
    player.pauseVideo();
  }, []);

  const resumePlayback = useCallback(async (): Promise<boolean> => attemptPlay(), [attemptPlay]);

  const seekBy = useCallback((_delta: number) => {}, []);
  const seekTo = useCallback((_seconds: number) => {}, []);

  const setVolume = useCallback(
    (v: number) => {
      const clamped = Math.min(100, Math.max(0, v));
      setVolumeState(clamped);
      persistVolume(clamped);

      if (clamped > 0 && muted) {
        setMuted(false);
      }

      applyVolumeToPlayer(clamped, clamped === 0 ? true : muted);
    },
    [muted, persistVolume, applyVolumeToPlayer],
  );

  const toggleMute = useCallback(() => {
    if (!getYouTubePlayer() || !readyRef.current) return;

    if (muted || volume === 0) {
      const restore = volume === 0 ? GLOBAL_MUSIC_DEFAULT_VOLUME : volume;
      setVolumeState(restore);
      setMuted(false);
      applyVolumeToPlayer(restore, false);
    } else {
      setMuted(true);
      applyVolumeToPlayer(volume, true);
    }
  }, [muted, volume, applyVolumeToPlayer]);

  const rewind = useCallback(() => seekBy(-seekStep), [seekBy, seekStep]);
  const fastForward = useCallback(() => seekBy(seekStep), [seekBy, seekStep]);

  const progress =
    !isLive && duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return useMemo(
    () => ({
      ready: ready && !shouldFallback,
      playing,
      currentTime,
      duration,
      volume,
      muted,
      error: shouldFallback ? error : error,
      progress,
      currentStream,
      isLive,
      autoplayBlocked,
      isMobile: isMobileMusicContext(),
      loading: loading && !shouldFallback,
      shouldFallback,
      retryStream,
      togglePlay,
      pausePlayback,
      resumePlayback,
      rewind,
      fastForward,
      seekTo,
      setVolume,
      toggleMute,
    }),
    [
      ready,
      shouldFallback,
      playing,
      currentTime,
      duration,
      volume,
      muted,
      error,
      progress,
      isLive,
      autoplayBlocked,
      loading,
      retryStream,
      togglePlay,
      pausePlayback,
      resumePlayback,
      rewind,
      fastForward,
      seekTo,
      setVolume,
      toggleMute,
    ],
  );
}
