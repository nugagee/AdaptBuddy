/**
 * Single YouTube player instance attached imperatively to document.body.
 * Avoids React removeChild conflicts when the IFrame API mutates the DOM.
 */

const YT_SCRIPT_ID = 'youtube-iframe-api';

export const YT_PLAYER_CONTAINER_ID = 'adaptbuddy-global-yt-player';

let containerEl: HTMLDivElement | null = null;
let playerInstance: YT.Player | null = null;
let initPromise: Promise<YT.Player> | null = null;
let subscriberCount = 0;

export type YouTubeStateHandler = (player: YT.Player) => void;
export type YouTubeStateChangeHandler = (player: YT.Player, state: number) => void;

export interface YouTubePlayerInitOptions {
  videoId: string;
  onReady?: YouTubeStateHandler;
  onStateChange?: YouTubeStateChangeHandler;
  onError?: () => void;
}

const readyListeners = new Set<YouTubeStateHandler>();
const stateChangeListeners = new Set<YouTubeStateChangeHandler>();
const errorListeners = new Set<() => void>();

function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();

  return new Promise((resolve) => {
    const existing = document.getElementById(YT_SCRIPT_ID);
    if (existing) {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve();
      };
      return;
    }

    const tag = document.createElement('script');
    tag.id = YT_SCRIPT_ID;
    tag.src = 'https://www.youtube.com/iframe_api';
    const first = document.getElementsByTagName('script')[0];
    first?.parentNode?.insertBefore(tag, first);

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
  });
}

function ensureContainer(): HTMLDivElement {
  if (containerEl?.isConnected) return containerEl;

  const existing = document.getElementById(YT_PLAYER_CONTAINER_ID);
  if (existing instanceof HTMLDivElement) {
    containerEl = existing;
    return containerEl;
  }

  containerEl = document.createElement('div');
  containerEl.id = YT_PLAYER_CONTAINER_ID;
  containerEl.className =
    'pointer-events-none fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0';
  containerEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(containerEl);
  return containerEl;
}

function notifyReady(player: YT.Player) {
  readyListeners.forEach((listener) => listener(player));
}

function notifyStateChange(player: YT.Player, state: number) {
  stateChangeListeners.forEach((listener) => listener(player, state));
}

function notifyError() {
  errorListeners.forEach((listener) => listener());
}

function createPlayer(videoId: string): Promise<YT.Player> {
  ensureContainer();

  return new Promise((resolve, reject) => {
    if (!window.YT?.Player) {
      reject(new Error('YouTube API unavailable'));
      return;
    }

    playerInstance = new window.YT.Player(YT_PLAYER_CONTAINER_ID, {
      height: '0',
      width: '0',
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady: (event) => {
          playerInstance = event.target;
          notifyReady(event.target);
          resolve(event.target);
        },
        onStateChange: (event) => {
          notifyStateChange(event.target, event.data);
        },
        onError: () => {
          notifyError();
          reject(new Error('YouTube player error'));
        },
      },
    });
  });
}

export function acquireYouTubePlayer(options: YouTubePlayerInitOptions): Promise<YT.Player> {
  subscriberCount += 1;

  if (options.onReady) readyListeners.add(options.onReady);
  if (options.onStateChange) stateChangeListeners.add(options.onStateChange);
  if (options.onError) errorListeners.add(options.onError);

  if (playerInstance) {
    options.onReady?.(playerInstance);
    try {
      options.onStateChange?.(playerInstance, playerInstance.getPlayerState());
    } catch {
      /* ignore */
    }
    return Promise.resolve(playerInstance);
  }

  if (!initPromise) {
    initPromise = loadYouTubeApi()
      .then(() => createPlayer(options.videoId))
      .catch((err) => {
        initPromise = null;
        throw err;
      });
  }

  return initPromise;
}

export interface YouTubePlayerReleaseOptions {
  onReady?: YouTubeStateHandler;
  onStateChange?: YouTubeStateChangeHandler;
  onError?: () => void;
}

/** Release a React subscription — does not destroy the player (Strict Mode safe). */
export function releaseYouTubePlayer(handlers: YouTubePlayerReleaseOptions): void {
  subscriberCount = Math.max(0, subscriberCount - 1);

  if (handlers.onReady) readyListeners.delete(handlers.onReady);
  if (handlers.onStateChange) stateChangeListeners.delete(handlers.onStateChange);
  if (handlers.onError) errorListeners.delete(handlers.onError);
}

export function getYouTubePlayer(): YT.Player | null {
  return playerInstance;
}
