const SESSION_STORAGE_PREFIX = 'adaptbuddy-session-time-';
const LAST_VISIT_STORAGE_PREFIX = 'adaptbuddy-last-visit-';

export function sessionStorageKey(userId: string): string {
  return `${SESSION_STORAGE_PREFIX}${userId}`;
}

export function lastVisitStorageKey(userId: string): string {
  return `${LAST_VISIT_STORAGE_PREFIX}${userId}`;
}

export function readSessionSeconds(userId: string): number {
  try {
    const raw = sessionStorage.getItem(sessionStorageKey(userId));
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

export function readLastVisitSeconds(userId: string): number {
  try {
    const raw = localStorage.getItem(lastVisitStorageKey(userId));
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export function writeSessionSeconds(userId: string, seconds: number): void {
  try {
    sessionStorage.setItem(sessionStorageKey(userId), String(Math.max(0, seconds)));
  } catch {
    /* ignore quota / private mode */
  }
}

export function saveLastVisitSeconds(userId: string, seconds: number): void {
  if (seconds <= 0) return;
  try {
    localStorage.setItem(lastVisitStorageKey(userId), String(Math.max(0, seconds)));
  } catch {
    /* ignore */
  }
}

export function clearChildSessionTime(userId: string): void {
  try {
    sessionStorage.removeItem(sessionStorageKey(userId));
  } catch {
    /* ignore */
  }
}

export function formatSessionDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export interface VisitComparison {
  message: string;
  ahead: boolean;
}

/** Returns a friendly challenge line when a previous visit exists. */
export function getVisitComparison(
  currentSeconds: number,
  lastVisitSeconds: number,
): VisitComparison | null {
  if (lastVisitSeconds <= 0) return null;

  const diff = currentSeconds - lastVisitSeconds;
  if (diff > 0) {
    return {
      ahead: true,
      message: `You're ${formatSessionDuration(diff)} ahead of last visit!`,
    };
  }
  if (diff < 0) {
    return {
      ahead: false,
      message: `${formatSessionDuration(Math.abs(diff))} to match last visit — keep going!`,
    };
  }
  return {
    ahead: true,
    message: 'You matched last visit — can you go further?',
  };
}

