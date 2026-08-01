/**
 * Single YouTube player instance attached imperatively to document.body.
 * Avoids React removeChild conflicts when the IFrame API mutates the DOM.
 */

const YT_SCRIPT_ID = 'youtube-iframe-api';

export const YT_PLAYER_CONTAINER_ID = 'adaptbuddy-global-yt-player';

/** YouTube requires at least 200×200 for the iframe — keep off-screen, not 0×0 */
const PLAYER_WIDTH = 200;
const PLAYER_HEIGHT = 200;

let containerEl: HTMLDivElement | null = null;
let playerInstance: YT.Player | null = null;
let initPromise: Promise<YT.Player> | null = null;
let initResolved = false;
let currentVideoId: string | null = null;

export type YouTubeStateHandler = (player: YT.Player) => void;
export type YouTubeStateChangeHandler = (player: YT.Player, state: number) => void;
export type YouTubeErrorHandler = (code: number) => void;

export interface YouTubePlayerHandlers {
  onReady?: YouTubeStateHandler;
  onStateChange?: YouTubeStateChangeHandler;
  onError?: YouTubeErrorHandler;
}

export interface YouTubePlayerInitOptions extends YouTubePlayerHandlers {
  videoId: string;
}

const readyListeners = new Set<YouTubeStateHandler>();
const stateChangeListeners = new Set<YouTubeStateChangeHandler>();
const errorListeners = new Set<YouTubeErrorHandler>();

function playerVars(): Record<string, string | number> {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  return {
    autoplay: 0,
    controls: 0,
    disablekb: 1,
    enablejsapi: 1,
    fs: 0,
    iv_load_policy: 3,
    modestbranding: 1,
    playsinline: 1,
    rel: 0,
    origin,
  };
}

function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      if (!window.YT?.Player) return;
      settled = true;
      resolve();
    };

    const pollId = window.setInterval(() => finish(), 100);

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      window.clearInterval(pollId);
      finish();
    };

    const existing = document.getElementById(YT_SCRIPT_ID);
    if (!existing) {
      const tag = document.createElement('script');
      tag.id = YT_SCRIPT_ID;
      tag.src = 'https://www.youtube.com/iframe_api';
      const first = document.getElementsByTagName('script')[0];
      first?.parentNode?.insertBefore(tag, first);
    }

    window.setTimeout(() => {
      window.clearInterval(pollId);
      finish();
    }, 12_000);
  });
}

function ensureContainer(): HTMLDivElement {
  const existing = document.getElementById(YT_PLAYER_CONTAINER_ID);
  if (existing instanceof HTMLDivElement) {
    containerEl = existing;
    return containerEl;
  }

  containerEl = document.createElement('div');
  containerEl.id = YT_PLAYER_CONTAINER_ID;
  containerEl.className =
    'pointer-events-none fixed -left-[9999px] top-0 overflow-hidden opacity-0';
  containerEl.style.width = `${PLAYER_WIDTH}px`;
  containerEl.style.height = `${PLAYER_HEIGHT}px`;
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

function notifyError(code: number) {
  errorListeners.forEach((listener) => listener(code));
}

function createPlayer(videoId: string): Promise<YT.Player> {
  ensureContainer();
  currentVideoId = videoId;

  if (containerEl && containerEl.childElementCount > 0) {
    containerEl.innerHTML = '';
  }

  return new Promise((resolve, reject) => {
    if (!window.YT?.Player) {
      reject(new Error('YouTube API unavailable'));
      return;
    }

    let settled = false;

    playerInstance = new window.YT.Player(YT_PLAYER_CONTAINER_ID, {
      height: PLAYER_HEIGHT,
      width: PLAYER_WIDTH,
      videoId,
      playerVars: playerVars(),
      events: {
        onReady: (event) => {
          if (settled) return;
          settled = true;
          playerInstance = event.target;
          initResolved = true;
          notifyReady(event.target);
          resolve(event.target);
        },
        onStateChange: (event) => {
          notifyStateChange(event.target, event.data);
        },
        onError: (event) => {
          const code = event.data ?? 0;
          notifyError(code);
          if (!settled) {
            settled = true;
            initResolved = false;
            playerInstance = null;
            reject(new Error(`YouTube player error ${code}`));
          }
        },
      },
    });
  });
}

export function acquireYouTubePlayer(options: YouTubePlayerInitOptions): Promise<YT.Player> {
  if (options.onReady) readyListeners.add(options.onReady);
  if (options.onStateChange) stateChangeListeners.add(options.onStateChange);
  if (options.onError) errorListeners.add(options.onError);

  if (playerInstance && initResolved) {
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
        initResolved = false;
        playerInstance = null;
        throw err;
      });
  }

  return initPromise.catch((err) => {
    options.onError?.(Number(String(err.message).match(/\d+/)?.[0] ?? 0));
    throw err;
  });
}

/** Release the exact handler references passed to {@link acquireYouTubePlayer}. */
export function releaseYouTubePlayer(handlers: YouTubePlayerHandlers): void {
  if (handlers.onReady) readyListeners.delete(handlers.onReady);
  if (handlers.onStateChange) stateChangeListeners.delete(handlers.onStateChange);
  if (handlers.onError) errorListeners.delete(handlers.onError);
}

export function getYouTubePlayer(): YT.Player | null {
  return playerInstance;
}

export function getCurrentVideoId(): string | null {
  return currentVideoId;
}

export function loadYouTubeVideo(videoId: string): boolean {
  const player = playerInstance;
  if (!player || !initResolved) return false;

  try {
    player.loadVideoById(videoId);
    currentVideoId = videoId;
    return true;
  } catch {
    return false;
  }
}

export function resetYouTubePlayerForRetry(videoId: string): Promise<YT.Player> {
  try {
    playerInstance?.destroy();
  } catch {
    /* ignore */
  }

  playerInstance = null;
  initPromise = null;
  initResolved = false;
  currentVideoId = null;

  if (containerEl?.parentNode) {
    containerEl.innerHTML = '';
  }

  initPromise = loadYouTubeApi()
    .then(() => createPlayer(videoId))
    .catch((err) => {
      initPromise = null;
      throw err;
    });

  return initPromise;
}
