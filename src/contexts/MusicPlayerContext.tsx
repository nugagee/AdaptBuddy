import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useYouTubePlayer } from 'hooks/useYouTubePlayer';
import { useUiStore } from 'store/uiStore';
import MusicPlayerBar from 'components/media/MusicPlayerBar';
import { Music2 } from 'lucide-react';

/** Lofi hip hop radio — https://youtu.be/jfKfPfyJRdk */
export const LOFI_STREAM_VIDEO_ID = 'jfKfPfyJRdk';
const COLLAPSE_DELAY_MS = 10_000;

type YouTubePlayerApi = ReturnType<typeof useYouTubePlayer>;

interface MusicPlayerContextValue extends YouTubePlayerApi {
  expanded: boolean;
  expandPlayer: () => void;
  collapsePlayer: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);

export function useMusicPlayer(): MusicPlayerContextValue {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) {
    throw new Error('useMusicPlayer must be used within MusicPlayerProvider');
  }
  return ctx;
}

interface MusicPlayerProviderProps {
  children: React.ReactNode;
}

export const MusicPlayerProvider: React.FC<MusicPlayerProviderProps> = ({ children }) => {
  const [expanded, setExpanded] = useState(true);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useUiStore((s) => s.reducedMotion);

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

  const panelTransition = reducedMotion
    ? ''
    : 'transition-[transform,opacity] duration-500 ease-in-out';
  const fabTransition = reducedMotion
    ? ''
    : 'transition-[transform,opacity,scale] duration-300 ease-out';

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}

      {/* Expanded player — slides down off-screen when collapsed */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[90] ${panelTransition} ${
          expanded
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-full opacity-0'
        }`}
        aria-hidden={!expanded}
      >
        <MusicPlayerBar />
      </div>

      {/* Collapsed FAB */}
      <button
        type="button"
        onClick={expandPlayer}
        className={`fixed bottom-5 right-4 z-[89] flex h-14 w-14 items-center justify-center rounded-full border border-white/60 bg-adapt-navy text-white shadow-card ${fabTransition} hover:bg-adapt-purple focus:outline-none focus-visible:ring-2 focus-visible:ring-adapt-indigo focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-adapt-indigo dark:hover:bg-adapt-purple sepia:border-amber-300/60 sepia:bg-amber-800 sepia:hover:bg-amber-900 ${
          expanded
            ? 'pointer-events-none scale-75 opacity-0'
            : 'scale-100 opacity-100'
        }`}
        aria-label={player.playing ? 'Show music player — now playing' : 'Show music player'}
        aria-expanded={expanded}
      >
        <Music2 className="h-6 w-6" aria-hidden />
        {player.playing && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center"
            aria-hidden
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-adapt-cyan opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-adapt-cyan" />
          </span>
        )}
      </button>
    </MusicPlayerContext.Provider>
  );
};

export default MusicPlayerProvider;
