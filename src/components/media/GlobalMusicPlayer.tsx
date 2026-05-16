import React from 'react';
import { Music2 } from 'lucide-react';
import { useMusicPlayer } from 'contexts/musicPlayerContext';
import { useUiStore } from 'store/uiStore';
import MusicPlayerBar from 'components/media/MusicPlayerBar';

/** Fixed music player shell (panel + FAB) — separate from provider to avoid circular imports */
const GlobalMusicPlayer: React.FC = () => {
  const { expanded, expandPlayer, playing } = useMusicPlayer();
  const reducedMotion = useUiStore((s) => s.reducedMotion);

  const panelTransition = reducedMotion
    ? ''
    : 'transition-[transform,opacity] duration-500 ease-in-out';
  const fabTransition = reducedMotion
    ? ''
    : 'transition-[transform,opacity,scale] duration-300 ease-out';

  return (
    <>
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

      <button
        type="button"
        onClick={expandPlayer}
        className={`fixed bottom-5 right-4 z-[89] flex h-14 w-14 items-center justify-center rounded-full border border-white/60 bg-adapt-navy text-white shadow-card ${fabTransition} hover:bg-adapt-purple focus:outline-none focus-visible:ring-2 focus-visible:ring-adapt-indigo focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-adapt-indigo dark:hover:bg-adapt-purple sepia:border-amber-300/60 sepia:bg-amber-800 sepia:hover:bg-amber-900 ${
          expanded
            ? 'pointer-events-none scale-75 opacity-0'
            : 'scale-100 opacity-100'
        }`}
        aria-label={playing ? 'Show music player — now playing' : 'Show music player'}
        aria-expanded={expanded}
      >
        <Music2 className="h-6 w-6" aria-hidden />
        {playing && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center"
            aria-hidden
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-adapt-cyan opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-adapt-cyan" />
          </span>
        )}
      </button>
    </>
  );
};

export default GlobalMusicPlayer;
