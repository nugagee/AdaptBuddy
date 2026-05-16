import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useYouTubePlayer } from 'hooks/useYouTubePlayer';
import {
  LOFI_STREAM_VIDEO_ID,
  MusicPlayerContext,
  type MusicPlayerContextValue,
} from 'contexts/musicPlayerContext';

const COLLAPSE_DELAY_MS = 10_000;

interface MusicPlayerProviderProps {
  children: React.ReactNode;
}

/** Provides global music player state — UI is rendered by GlobalMusicPlayer */
export const MusicPlayerProvider: React.FC<MusicPlayerProviderProps> = ({ children }) => {
  const [expanded, setExpanded] = useState(true);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const player = useYouTubePlayer({
    videoId: LOFI_STREAM_VIDEO_ID,
    seekStep: 10,
    autoPlayDelayMs: 2000,
    initialVolume: 35,
  });

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

  useEffect(() => {
    if (!expanded) return undefined;
    scheduleCollapse();
    return clearCollapseTimer;
  }, [expanded, scheduleCollapse, clearCollapseTimer]);

  useEffect(() => {
    const offset = expanded ? '9.5rem' : '4.75rem';
    document.documentElement.style.setProperty('--music-player-offset', offset);
    return () => {
      document.documentElement.style.removeProperty('--music-player-offset');
    };
  }, [expanded]);

  const value = useMemo<MusicPlayerContextValue>(
    () => ({
      ...player,
      expanded,
      expandPlayer,
      collapsePlayer,
    }),
    [player, expanded, expandPlayer, collapsePlayer],
  );

  return (
    <MusicPlayerContext.Provider value={value}>{children}</MusicPlayerContext.Provider>
  );
};

export default MusicPlayerProvider;
