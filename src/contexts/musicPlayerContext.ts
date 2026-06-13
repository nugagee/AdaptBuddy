import { createContext, useContext } from 'react';
import type { useAudioPlayer } from 'hooks/useAudioPlayer';

export type YouTubePlayerApi = ReturnType<typeof useAudioPlayer>;

export interface MusicPlayerContextValue extends YouTubePlayerApi {
  expanded: boolean;
  expandPlayer: () => void;
  collapsePlayer: () => void;
  /** True while /music soundscape has taken over playback */
  soundscapeOverrideActive: boolean;
  beginSoundscapeOverride: () => void;
  endSoundscapeOverride: () => void;
}

export const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);

export function useMusicPlayer(): MusicPlayerContextValue {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) {
    throw new Error('useMusicPlayer must be used within MusicPlayerProvider');
  }
  return ctx;
}
