import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  GLOBAL_MUSIC_AUTOPLAY_DELAY_MS,
  GLOBAL_MUSIC_DEFAULT_VOLUME,
  GLOBAL_YOUTUBE_STREAM,
  isGlobalMusicAutoplayRoute,
} from 'constants/musicStreams';
import { useAudioPlayer } from 'hooks/useAudioPlayer';
import { useYouTubeMusicPlayer } from 'hooks/useYouTubeMusicPlayer';

export interface UseGlobalMusicPlayerOptions {
  seekStep?: number;
}

export type GlobalMusicPlayerApi = ReturnType<typeof useAudioPlayer> & {
  loading?: boolean;
  shouldFallback?: boolean;
  backend: 'youtube' | 'audio';
};

/** YouTube live stream with HTML5 audio fallback when embed fails or times out. */
export function useGlobalMusicPlayer({
  seekStep = 10,
}: UseGlobalMusicPlayerOptions = {}): GlobalMusicPlayerApi {
  const { pathname } = useLocation();
  const shouldAutoplay = isGlobalMusicAutoplayRoute(pathname);
  const autoPlayDelayMs = shouldAutoplay ? GLOBAL_MUSIC_AUTOPLAY_DELAY_MS : undefined;

  const youtube = useYouTubeMusicPlayer({
    seekStep,
    initialVolume: GLOBAL_MUSIC_DEFAULT_VOLUME,
    autoPlayDelayMs,
  });

  const useAudioFallback = youtube.shouldFallback;

  const audio = useAudioPlayer({
    seekStep,
    initialVolume: GLOBAL_MUSIC_DEFAULT_VOLUME,
    autoPlayDelayMs: useAudioFallback ? autoPlayDelayMs : undefined,
  });

  return useMemo((): GlobalMusicPlayerApi => {
    if (!useAudioFallback) {
      return {
        ...youtube,
        backend: 'youtube',
      };
    }

    return {
      ...audio,
      backend: 'audio',
      loading: false,
      shouldFallback: true,
      currentStream: {
        ...GLOBAL_YOUTUBE_STREAM,
        title: 'AdaptBuddy calm ambient (fallback)',
        sourceLabel: youtube.error
          ? 'Ambient stream — open YouTube live'
          : audio.currentStream.sourceLabel,
      },
    };
  }, [youtube, audio, useAudioFallback]);
}
