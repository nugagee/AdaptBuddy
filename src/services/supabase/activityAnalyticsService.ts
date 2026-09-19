import { getSupabaseClient } from 'services/supabase/client';

export type ActivityGranularity = 'hour' | 'day' | 'week' | 'month' | 'year';

function throwRpcError(error: unknown): never {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message || 'Request failed');
    const hint = 'hint' in error ? String((error as { hint?: unknown }).hint || '') : '';
    throw new Error(hint ? `${message} (${hint})` : message);
  }
  throw error instanceof Error ? error : new Error('Request failed');
}

export interface ActivityTimelinePoint {
  bucket: string;
  sessions: number;
  page_views: number;
  unique_visitors: number;
  unique_users: number;
}

export interface ActivityOverview {
  granularity: ActivityGranularity;
  from: string;
  to: string;
  sessions: number;
  unique_visitors: number;
  unique_users: number;
  page_views: number;
  avg_session_ms: number;
  avg_active_ms: number;
  avg_page_duration_ms: number;
  by_role: Record<string, number>;
  timeline: ActivityTimelinePoint[];
}

export interface TopPageStat {
  path_group: string;
  views: number;
  sessions: number;
  visitors: number;
  avg_active_ms: number;
  avg_duration_ms: number;
  total_active_ms: number;
}

export interface TopUserStat {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  sessions: number;
  page_views: number;
  total_duration_ms: number;
  last_seen_at: string;
}

export interface TopVisitorStat {
  visitor_id: string;
  visitor_key: string;
  user_id: string | null;
  email: string | null;
  display_name: string | null;
  role: string;
  sessions: number;
  page_views: number;
  total_duration_ms: number;
  last_seen_at: string;
}

export interface OnlinePresenceSession {
  session_id: string;
  visitor_id: string;
  user_id: string | null;
  role: string;
  is_guest: boolean;
  started_at: string;
  last_activity_at: string;
  page_count: number;
  duration_ms: number;
  entry_path: string | null;
  current_path: string | null;
  current_path_group: string | null;
  current_title: string | null;
  current_page_active_ms: number | null;
  current_page_entered_at: string | null;
  viewport_width: number | null;
  viewport_height: number | null;
  timezone: string | null;
  visitor_key: string;
  email: string | null;
  display_name: string | null;
  seconds_since_activity: number;
}

export interface OnlinePresence {
  as_of: string;
  within_seconds: number;
  online_sessions: number;
  online_users: number;
  online_anonymous: number;
  by_role: Record<string, number>;
  sessions: OnlinePresenceSession[];
}

export interface JourneyPageView {
  id: string;
  session_id: string;
  path: string;
  path_group: string;
  title: string | null;
  sequence_no: number;
  entered_at: string;
  exited_at: string | null;
  duration_ms: number;
  active_ms: number;
  referrer_path: string | null;
}

export interface JourneySession {
  id: string;
  started_at: string;
  ended_at: string | null;
  entry_path: string | null;
  exit_path: string | null;
  page_count: number;
  duration_ms: number;
  user_role: string | null;
  is_guest: boolean;
}

export interface UserJourney {
  profile: {
    id?: string;
    email?: string;
    display_name?: string;
    role?: string;
  };
  page_views: JourneyPageView[];
  sessions: JourneySession[];
}

export function rangeForGranularity(granularity: ActivityGranularity, now = new Date()): {
  from: string;
  to: string;
} {
  const to = now.toISOString();
  const from = new Date(now);
  switch (granularity) {
    case 'hour':
      from.setHours(from.getHours() - 24);
      break;
    case 'week':
      from.setDate(from.getDate() - 7 * 12);
      break;
    case 'month':
      from.setMonth(from.getMonth() - 12);
      break;
    case 'year':
      from.setFullYear(from.getFullYear() - 5);
      break;
    case 'day':
    default:
      from.setDate(from.getDate() - 30);
      break;
  }
  return { from: from.toISOString(), to };
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes ? `${hours}h ${remMinutes}m` : `${hours}h`;
}

export async function fetchActivityOverview(
  granularity: ActivityGranularity,
  from?: string,
  to?: string,
): Promise<ActivityOverview> {
  const range = from && to ? { from, to } : rangeForGranularity(granularity);
  const { data, error } = await getSupabaseClient().rpc('admin_get_activity_overview', {
    p_granularity: granularity,
    p_from: range.from,
    p_to: range.to,
  });
  if (error) throwRpcError(error);
  const raw = (data ?? {}) as Partial<ActivityOverview>;
  return {
    granularity: (raw.granularity as ActivityGranularity) || granularity,
    from: String(raw.from ?? range.from),
    to: String(raw.to ?? range.to),
    sessions: Number(raw.sessions ?? 0),
    unique_visitors: Number(raw.unique_visitors ?? 0),
    unique_users: Number(raw.unique_users ?? 0),
    page_views: Number(raw.page_views ?? 0),
    avg_session_ms: Number(raw.avg_session_ms ?? 0),
    avg_active_ms: Number(raw.avg_active_ms ?? 0),
    avg_page_duration_ms: Number(raw.avg_page_duration_ms ?? 0),
    by_role: (raw.by_role as Record<string, number>) ?? {},
    timeline: Array.isArray(raw.timeline) ? raw.timeline : [],
  };
}

export async function fetchTopPages(from: string, to: string, limit = 20): Promise<TopPageStat[]> {
  const { data, error } = await getSupabaseClient().rpc('admin_get_top_pages', {
    p_from: from,
    p_to: to,
    p_limit: limit,
  });
  if (error) throwRpcError(error);
  return (Array.isArray(data) ? data : []) as TopPageStat[];
}

export async function fetchTopUsers(from: string, to: string, limit = 20): Promise<TopUserStat[]> {
  const { data, error } = await getSupabaseClient().rpc('admin_get_top_users', {
    p_from: from,
    p_to: to,
    p_limit: limit,
  });
  if (error) throwRpcError(error);
  return (Array.isArray(data) ? data : []) as TopUserStat[];
}

export async function fetchTopVisitors(
  from: string,
  to: string,
  limit = 20,
): Promise<TopVisitorStat[]> {
  const { data, error } = await getSupabaseClient().rpc('admin_get_top_visitors', {
    p_from: from,
    p_to: to,
    p_limit: limit,
  });
  if (error) throwRpcError(error);
  return (Array.isArray(data) ? data : []) as TopVisitorStat[];
}

export async function fetchOnlinePresence(withinSeconds = 120): Promise<OnlinePresence> {
  const { data, error } = await getSupabaseClient().rpc('admin_get_online_presence', {
    p_within_seconds: withinSeconds,
  });
  if (error) throwRpcError(error);
  const raw = (data ?? {}) as Partial<OnlinePresence>;
  return {
    as_of: String(raw.as_of ?? new Date().toISOString()),
    within_seconds: Number(raw.within_seconds ?? withinSeconds),
    online_sessions: Number(raw.online_sessions ?? 0),
    online_users: Number(raw.online_users ?? 0),
    online_anonymous: Number(raw.online_anonymous ?? 0),
    by_role: (raw.by_role as Record<string, number>) ?? {},
    sessions: Array.isArray(raw.sessions) ? (raw.sessions as OnlinePresenceSession[]) : [],
  };
}

export async function fetchUserJourney(params: {
  userId?: string | null;
  visitorId?: string | null;
  from: string;
  to: string;
}): Promise<UserJourney> {
  const { data, error } = await getSupabaseClient().rpc('admin_get_user_journey', {
    p_user_id: params.userId ?? null,
    p_visitor_id: params.visitorId ?? null,
    p_from: params.from,
    p_to: params.to,
    p_limit: 200,
  });
  if (error) throwRpcError(error);
  const raw = (data ?? {}) as Partial<UserJourney>;
  return {
    profile: raw.profile ?? {},
    page_views: Array.isArray(raw.page_views) ? raw.page_views : [],
    sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
  };
}
