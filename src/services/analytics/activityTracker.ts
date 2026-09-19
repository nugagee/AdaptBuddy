import { getSupabaseClient, isSupabaseConfigured } from 'services/supabase/client';
import { useAuthStore } from 'store/authStore';

const VISITOR_KEY = 'adaptbuddy-analytics-visitor';
const SESSION_KEY = 'adaptbuddy-analytics-session';
const HEARTBEAT_MS = 15_000;
const SESSION_IDLE_MS = 30 * 60 * 1000;

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `v-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeAnalyticsPath(pathname: string): string {
  const clean = (pathname || '/').split('?')[0].split('#')[0] || '/';
  return clean.replace(UUID_RE, ':id');
}

export function getVisitorKey(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing && existing.length >= 8) return existing;
    const next = createId();
    localStorage.setItem(VISITOR_KEY, next);
    return next;
  } catch {
    return createId();
  }
}

export function getClientEnvironmentSnapshot(): Record<string, string | number | null> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      userAgent: null,
      language: null,
      timezone: null,
      screenWidth: null,
      screenHeight: null,
      path: null,
    };
  }

  let timezone: string | null = null;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    timezone = null;
  }

  return {
    userAgent: navigator.userAgent || null,
    language: navigator.language || navigator.languages?.[0] || null,
    timezone,
    screenWidth: window.screen?.width ?? null,
    screenHeight: window.screen?.height ?? null,
    path: normalizeAnalyticsPath(window.location.pathname || '/'),
  };
}

type SessionCache = {
  sessionId: string;
  startedAt: number;
};

function readSessionCache(): SessionCache | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionCache;
    if (!parsed?.sessionId) return null;
    if (Date.now() - parsed.startedAt > SESSION_IDLE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionCache(sessionId: string) {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ sessionId, startedAt: Date.now() } satisfies SessionCache),
    );
  } catch {
    // ignore private mode failures
  }
}

function clearSessionCache() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

type TrackerState = {
  visitorKey: string;
  sessionId: string | null;
  pageViewId: string | null;
  sequence: number;
  path: string | null;
  activeStartedAt: number | null;
  activeMs: number;
  heartbeatTimer: ReturnType<typeof setInterval> | null;
  starting: Promise<string | null> | null;
};

const state: TrackerState = {
  visitorKey: '',
  sessionId: null,
  pageViewId: null,
  sequence: 0,
  path: null,
  activeStartedAt: null,
  activeMs: 0,
  heartbeatTimer: null,
  starting: null,
};

function currentRole(): string | null {
  const { profile, isGuest } = useAuthStore.getState();
  if (isGuest) return 'guest';
  return profile?.role ?? null;
}

function isGuestMode(): boolean {
  return useAuthStore.getState().isGuest === true;
}

async function ensureSession(entryPath: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  if (state.sessionId) return state.sessionId;
  const cached = readSessionCache();
  if (cached?.sessionId) {
    state.sessionId = cached.sessionId;
    return cached.sessionId;
  }

  if (state.starting) return state.starting;

  state.starting = (async () => {
    try {
      const visitorKey = state.visitorKey || getVisitorKey();
      state.visitorKey = visitorKey;
      const { data, error } = await getSupabaseClient().rpc('analytics_start_session', {
        p_visitor_key: visitorKey,
        p_entry_path: entryPath,
        p_referrer: typeof document !== 'undefined' ? document.referrer || null : null,
        p_user_role: currentRole(),
        p_is_guest: isGuestMode(),
        p_viewport_width: typeof window !== 'undefined' ? window.innerWidth : null,
        p_viewport_height: typeof window !== 'undefined' ? window.innerHeight : null,
        p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      });
      if (error) throw error;
      const sessionId = data as string;
      state.sessionId = sessionId;
      writeSessionCache(sessionId);
      return sessionId;
    } catch (error) {
      console.warn('Analytics session start failed:', error);
      return null;
    } finally {
      state.starting = null;
    }
  })();

  return state.starting;
}

function pauseActiveClock() {
  if (state.activeStartedAt == null) return;
  state.activeMs += Math.max(0, Date.now() - state.activeStartedAt);
  state.activeStartedAt = null;
}

function resumeActiveClock() {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  if (state.activeStartedAt == null) state.activeStartedAt = Date.now();
}

function currentActiveMs(): number {
  const live =
    state.activeStartedAt == null ? 0 : Math.max(0, Date.now() - state.activeStartedAt);
  return state.activeMs + live;
}

async function flushHeartbeat() {
  if (!isSupabaseConfigured || !state.pageViewId) return;
  const delta = currentActiveMs();
  if (delta <= 0) return;

  const sent = delta;
  state.activeMs = 0;
  if (state.activeStartedAt != null) state.activeStartedAt = Date.now();

  try {
    await getSupabaseClient().rpc('analytics_heartbeat_page', {
      p_page_view_id: state.pageViewId,
      p_visitor_key: state.visitorKey,
      p_active_ms_delta: sent,
    });
  } catch (error) {
    state.activeMs += sent;
    console.warn('Analytics heartbeat failed:', error);
  }
}

function stopHeartbeat() {
  if (state.heartbeatTimer) {
    clearInterval(state.heartbeatTimer);
    state.heartbeatTimer = null;
  }
}

function startHeartbeat() {
  stopHeartbeat();
  state.heartbeatTimer = setInterval(() => {
    void flushHeartbeat();
  }, HEARTBEAT_MS);
}

async function closeCurrentPage() {
  if (!state.pageViewId || !isSupabaseConfigured) {
    state.pageViewId = null;
    state.path = null;
    state.activeMs = 0;
    state.activeStartedAt = null;
    return;
  }

  pauseActiveClock();
  const pageViewId = state.pageViewId;
  const activeMs = state.activeMs;
  state.pageViewId = null;
  state.path = null;
  state.activeMs = 0;
  state.activeStartedAt = null;
  stopHeartbeat();

  try {
    await getSupabaseClient().rpc('analytics_end_page_view', {
      p_page_view_id: pageViewId,
      p_visitor_key: state.visitorKey,
      p_active_ms: activeMs,
    });
  } catch (error) {
    console.warn('Analytics page end failed:', error);
  }
}

export async function trackPageView(pathname: string, title?: string): Promise<void> {
  if (!isSupabaseConfigured || typeof window === 'undefined') return;

  const path = pathname || '/';
  const pathGroup = normalizeAnalyticsPath(path);
  if (state.path === path && state.pageViewId) return;

  state.visitorKey = state.visitorKey || getVisitorKey();

  await closeCurrentPage();

  const sessionId = await ensureSession(path);
  if (!sessionId) return;

  state.sequence += 1;
  try {
    const { data, error } = await getSupabaseClient().rpc('analytics_record_page_view', {
      p_session_id: sessionId,
      p_visitor_key: state.visitorKey,
      p_path: path,
      p_path_group: pathGroup,
      p_title: title || (typeof document !== 'undefined' ? document.title : null),
      p_referrer_path: state.path,
      p_sequence_no: state.sequence,
    });
    if (error) throw error;
    state.pageViewId = data as string;
    state.path = path;
    state.activeMs = 0;
    resumeActiveClock();
    startHeartbeat();
  } catch (error) {
    console.warn('Analytics page view failed:', error);
  }
}

export async function endAnalyticsSession(): Promise<void> {
  if (!isSupabaseConfigured) return;
  await closeCurrentPage();
  if (!state.sessionId) return;

  const sessionId = state.sessionId;
  state.sessionId = null;
  clearSessionCache();

  try {
    await getSupabaseClient().rpc('analytics_end_session', {
      p_session_id: sessionId,
      p_visitor_key: state.visitorKey || getVisitorKey(),
    });
  } catch (error) {
    console.warn('Analytics session end failed:', error);
  }
}

export function bindAnalyticsLifecycle(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      pauseActiveClock();
      void flushHeartbeat();
    } else {
      resumeActiveClock();
    }
  };

  const onPageHide = () => {
    pauseActiveClock();
    void flushHeartbeat();
    void closeCurrentPage();
  };

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);

  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
    stopHeartbeat();
  };
}
