import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAudioPlayer } from 'hooks/useAudioPlayer';
import {
  MusicPlayerContext,
  type MusicPlayerContextValue,
} from 'contexts/musicPlayerContext';

const COLLAPSE_DELAY_MS = 10_000;

interface MusicPlayerProviderProps {
  children: React.ReactNode;
}

/** Provides global music player state — UI is rendered by GlobalMusicPlayer */
export const MusicPlayerProvider: React.FC<MusicPlayerProviderProps> = ({ children }) => {
  const [expanded, setExpanded] = useState(false);
  const [soundscapeOverrideActive, setSoundscapeOverrideActive] = useState(false);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundscapeOverrideRef = useRef(false);
  const wasPlayingBeforeOverrideRef = useRef(false);

  const player = useAudioPlayer({
    seekStep: 10,
    initialVolume: 35,
  });

  const { playing, pausePlayback, resumePlayback } = player;

  const clearCollapseTimer = useCallback(() => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  }, []);

  const scheduleCollapse = useCallback(() => {
    clearCollapseTimer();
    collapseTimerRef.current = setTimeout(() => {
      setExpanded(false);
    }, COLLAPSE_DELAY_MS);
  }, [clearCollapseTimer]);

  const expandPlayer = useCallback(() => {
    setExpanded(true);
    scheduleCollapse();
  }, [scheduleCollapse]);

  const collapsePlayer = useCallback(() => {
    clearCollapseTimer();
    setExpanded(false);
  }, [clearCollapseTimer]);

  const beginSoundscapeOverride = useCallback(() => {
    if (soundscapeOverrideRef.current) return;

    soundscapeOverrideRef.current = true;
    setSoundscapeOverrideActive(true);
    wasPlayingBeforeOverrideRef.current = playing;

    if (playing) {
      pausePlayback();
    }

    collapsePlayer();
  }, [playing, pausePlayback, collapsePlayer]);

  const endSoundscapeOverride = useCallback(() => {
    if (!soundscapeOverrideRef.current) return;

    soundscapeOverrideRef.current = false;
    setSoundscapeOverrideActive(false);

    const shouldResume = wasPlayingBeforeOverrideRef.current;
    wasPlayingBeforeOverrideRef.current = false;

    if (shouldResume) {
      void resumePlayback();
    }
  }, [resumePlayback]);

  useEffect(() => {
    if (!expanded) return undefined;
    scheduleCollapse();
    return clearCollapseTimer;
  }, [expanded, scheduleCollapse, clearCollapseTimer]);

  useEffect(() => {
    if (soundscapeOverrideActive) {
      document.documentElement.style.setProperty('--music-player-offset', '0px');
      return () => {
        document.documentElement.style.removeProperty('--music-player-offset');
      };
    }

    const offset = expanded ? '9.5rem' : '4.75rem';
    document.documentElement.style.setProperty('--music-player-offset', offset);
    return () => {
      document.documentElement.style.removeProperty('--music-player-offset');
    };
  }, [expanded, soundscapeOverrideActive]);

  const value = useMemo<MusicPlayerContextValue>(
    () => ({
      ...player,
      expanded,
      expandPlayer,
      collapsePlayer,
      soundscapeOverrideActive,
      beginSoundscapeOverride,
      endSoundscapeOverride,
    }),
    [
      player,
      expanded,
      expandPlayer,
      collapsePlayer,
      soundscapeOverrideActive,
      beginSoundscapeOverride,
      endSoundscapeOverride,
    ],
  );

  return (
    <MusicPlayerContext.Provider value={value}>{children}</MusicPlayerContext.Provider>
  );
};

export default MusicPlayerProvider;
