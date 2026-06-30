/** Direct audio streams — playable in HTML5 `<audio>` (no YouTube embed restrictions) */
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
