/** Direct audio streams — playable in HTML5 `<audio>` (fallback / legacy) */
export interface MusicStream {
  id: string;
  title: string;
  /** Direct stream or audio file URL */
  src: string;
  /** Shown as attribution / optional external link */
  sourceUrl: string;
  sourceLabel: string;
  /** Live radio — hide seek bar / show LIVE */
  isLive?: boolean;
}

/** Global background music — YouTube live ambient stream */
export const GLOBAL_YOUTUBE_LIVE_VIDEO_ID = 'X4VbdwhkE10';
export const GLOBAL_YOUTUBE_LIVE_URL =
  'https://www.youtube.com/live/X4VbdwhkE10?si=BZi5kBXB6Llh9cun';
export const GLOBAL_MUSIC_AUTOPLAY_DELAY_MS = 3_000;
export const GLOBAL_MUSIC_DEFAULT_VOLUME = 20;

export const GLOBAL_YOUTUBE_STREAM: MusicStream = {
  id: 'youtube-live-ambient',
  title: 'AdaptBuddy calm live stream',
  src: '',
  sourceUrl: GLOBAL_YOUTUBE_LIVE_URL,
  sourceLabel: 'YouTube Live',
  isLive: true,
};

/** Routes where global music auto-starts after {@link GLOBAL_MUSIC_AUTOPLAY_DELAY_MS} */
export const GLOBAL_MUSIC_AUTOPLAY_ROUTES = ['/', '/dashboard'] as const;

export function isGlobalMusicAutoplayRoute(pathname: string): boolean {
  return (GLOBAL_MUSIC_AUTOPLAY_ROUTES as readonly string[]).includes(pathname);
}

export const MUSIC_STREAMS: MusicStream[] = [
  {
    id: 'somafm-groovesalad',
    title: 'Groove Salad — ambient focus',
    src: 'https://ice6.somafm.com/groovesalad-128-mp3',
    sourceUrl: 'https://somafm.com/groovesalad',
    sourceLabel: 'SomaFM Groove Salad',
    isLive: true,
  },
  {
    id: 'somafm-liquidbeat',
    title: 'Liquid Beat — downtempo & hip hop',
    src: 'https://ice6.somafm.com/liquidbeat-128-mp3',
    sourceUrl: 'https://somafm.com/liquidbeat',
    sourceLabel: 'SomaFM Liquid Beat',
    isLive: true,
  },
  {
    id: 'somafm-defcon',
    title: 'DEF CON Radio — chill electronic',
    src: 'https://ice6.somafm.com/defcon-128-mp3',
    sourceUrl: 'https://somafm.com/defcon',
    sourceLabel: 'SomaFM DEF CON Radio',
    isLive: true,
  },
];

export const DEFAULT_MUSIC_STREAM = MUSIC_STREAMS[0];

/** YouTube lofi (opens externally — embedding blocked on most sites) */
export const YOUTUBE_LOFI_URL = 'https://youtu.be/jfKfPfyJRdk';

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;
  return (
    window.matchMedia('(max-width: 768px)').matches ||
    window.matchMedia('(pointer: coarse)').matches
  );
}

export function isMobileMusicContext(): boolean {
  return isMobileDevice();
}
