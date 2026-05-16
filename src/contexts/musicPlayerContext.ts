import { createContext, useContext } from 'react';
import type { useYouTubePlayer } from 'hooks/useYouTubePlayer';

/** Lofi hip hop radio — https://youtu.be/jfKfPfyJRdk */
export const LOFI_STREAM_VIDEO_ID = 'jfKfPfyJRdk';

export type YouTubePlayerApi = ReturnType<typeof useYouTubePlayer>;

export interface MusicPlayerContextValue extends YouTubePlayerApi {
  expanded: boolean;
  expandPlayer: () => void;
  collapsePlayer: () => void;
}

export const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);

export function useMusicPlayer(): MusicPlayerContextValue {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) {
    throw new Error('useMusicPlayer must be used within MusicPlayerProvider');
  }
  return ctx;
}
