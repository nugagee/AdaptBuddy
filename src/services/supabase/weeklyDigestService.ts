import { getSupabaseClient, isSupabaseConfigured, type Profile } from 'services/supabase/client';
import {
  BuddyDigestService,
  type BuddyDigest,
  type BuddyDigestPriority,
  type BuddyDigestScope,
} from 'services/supabase/buddyDigestService';
import {
  EvidencePackService,
  type EvidencePack,
} from 'services/supabase/evidencePackService';

export type WeeklyDigestFrequency = 'weekly' | 'fortnightly' | 'monthly';
export type WeeklyDigestDeliveryMethod = 'in_app' | 'email' | 'both';
export type WeeklyDigestSnapshotStatus = 'draft' | 'generated' | 'email_ready' | 'sent' | 'failed' | 'archived';

export interface WeeklyDigestSubscription {
  id: string;
  userId: string;
  scope: BuddyDigestScope;
  childId?: string | null;
  classId?: string | null;
  frequency: WeeklyDigestFrequency;
  deliveryMethod: WeeklyDigestDeliveryMethod;
  enabled: boolean;
  emailTo?: string | null;
  timezone: string;
  dayOfWeek: number;
  preferredHour: number;
  lastGeneratedAt?: string | null;
  nextRunAt?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyDigestSnapshot {
  id: string;
  subscriptionId?: string | null;
  userId: string;
  scope: BuddyDigestScope;
  childId?: string | null;
  classId?: string | null;
  title: string;
  subjectName: string;
  windowLabel: string;
  priority: BuddyDigestPriority;
  status: WeeklyDigestSnapshotStatus;
  digest: BuddyDigest;
  evidencePack: EvidencePack;
  emailTo?: string | null;
  emailSubject?: string | null;
  emailError?: string | null;
  generatedAt: string;
  scheduledFor?: string | null;
  emailReadyAt?: string | null;
  emailedAt?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyDigestTarget {
  childIds?: string[];
  classId?: string | null;
  scope?: BuddyDigestScope;
}

export interface WeeklyDigestSubscriptionInput extends WeeklyDigestTarget {
  enabled: boolean;
  frequency: WeeklyDigestFrequency;
  deliveryMethod: WeeklyDigestDeliveryMethod;
  emailTo?: string;
  timezone?: string;
  dayOfWeek: number;
  preferredHour: number;
}

export interface WeeklyDigestGenerateOptions extends WeeklyDigestTarget {
  markEmailReady?: boolean;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  scope: BuddyDigestScope;
  child_id?: string | null;
  class_id?: string | null;
  frequency?: WeeklyDigestFrequency | null;
  delivery_method?: WeeklyDigestDeliveryMethod | null;
  enabled?: boolean | null;
  email_to?: string | null;
  timezone?: string | null;
  day_of_week?: number | null;
  preferred_hour?: number | null;
  last_generated_at?: string | null;
  next_run_at?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface SnapshotRow {
  id: string;
  subscription_id?: string | null;
  user_id: string;
  scope: BuddyDigestScope;
  child_id?: string | null;
  class_id?: string | null;
  title: string;
  subject_name: string;
  window_label: string;
  priority: BuddyDigestPriority;
  status: WeeklyDigestSnapshotStatus;
  digest: BuddyDigest;
  evidence_pack: EvidencePack;
  email_to?: string | null;
  email_subject?: string | null;
  email_error?: string | null;
  generated_at: string;
  scheduled_for?: string | null;
  email_ready_at?: string | null;
  emailed_at?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_TIMEZONE = 'Europe/London';

const normalizeScope = (profile: Profile, scope?: BuddyDigestScope): BuddyDigestScope => {
  if (scope) return scope;
  if (profile.role === 'teacher') return 'class';
  if (profile.role === 'admin') return 'platform';
  return 'child';
};

const normalizeEmail = (email?: string | null): string | null => {
  const trimmed = email?.trim();
  return trimmed || null;
};

const clampDay = (day: number): number => Math.min(6, Math.max(0, Math.round(day)));
const clampHour = (hour: number): number => Math.min(23, Math.max(0, Math.round(hour)));

const sameChildTarget = (row: SubscriptionRow, childIds?: string[]): boolean => {
  const requested = childIds?.filter(Boolean) ?? [];
  if (!requested.length) return !row.child_id;
  return row.child_id === requested[0];
};

const sameClassTarget = (row: SubscriptionRow, target: WeeklyDigestTarget): boolean => {
  if (target.classId) return row.class_id === target.classId;
  const requested = target.childIds?.filter(Boolean) ?? [];
  const stored = Array.isArray(row.metadata?.target_child_ids) ? row.metadata?.target_child_ids : [];
  return JSON.stringify(stored) === JSON.stringify(requested);
};

const matchesTarget = (row: SubscriptionRow, profile: Profile, target: WeeklyDigestTarget): boolean => {
  const scope = normalizeScope(profile, target.scope);
  if (row.scope !== scope) return false;
  if (scope === 'child') return sameChildTarget(row, target.childIds);
  if (scope === 'class') return sameClassTarget(row, target);
  return true;
};

const calculateNextRunAt = (dayOfWeek: number, preferredHour: number): string => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(clampHour(preferredHour), 0, 0, 0);

  const daysAhead = (clampDay(dayOfWeek) - next.getDay() + 7) % 7;
  next.setDate(next.getDate() + daysAhead);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 7);

  return next.toISOString();
};

const toSubscription = (row: SubscriptionRow): WeeklyDigestSubscription => ({
  id: row.id,
  userId: row.user_id,
  scope: row.scope,
  childId: row.child_id ?? null,
  classId: row.class_id ?? null,
  frequency: row.frequency ?? 'weekly',
  deliveryMethod: row.delivery_method ?? 'in_app',
  enabled: row.enabled !== false,
  emailTo: row.email_to ?? null,
  timezone: row.timezone ?? DEFAULT_TIMEZONE,
  dayOfWeek: row.day_of_week ?? 0,
  preferredHour: row.preferred_hour ?? 9,
  lastGeneratedAt: row.last_generated_at ?? null,
  nextRunAt: row.next_run_at ?? null,
  metadata: row.metadata ?? {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toSnapshot = (row: SnapshotRow): WeeklyDigestSnapshot => ({
  id: row.id,
  subscriptionId: row.subscription_id ?? null,
  userId: row.user_id,
  scope: row.scope,
  childId: row.child_id ?? null,
  classId: row.class_id ?? null,
  title: row.title,
  subjectName: row.subject_name,
  windowLabel: row.window_label,
  priority: row.priority,
  status: row.status,
  digest: row.digest,
  evidencePack: row.evidence_pack,
  emailTo: row.email_to ?? null,
  emailSubject: row.email_subject ?? null,
  emailError: row.email_error ?? null,
  generatedAt: row.generated_at,
  scheduledFor: row.scheduled_for ?? null,
  emailReadyAt: row.email_ready_at ?? null,
  emailedAt: row.emailed_at ?? null,
  metadata: row.metadata ?? {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const getLocalSnapshotsKey = (profile: Profile): string => `adaptbuddy-weekly-digest-snapshots:${profile.id}`;

const readLocalSnapshots = (profile: Profile): WeeklyDigestSnapshot[] => {
  try {
    const raw = window.localStorage.getItem(getLocalSnapshotsKey(profile));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const storeLocalSnapshot = (profile: Profile, snapshot: WeeklyDigestSnapshot): void => {
  try {
    const snapshots = [snapshot, ...readLocalSnapshots(profile)].slice(0, 10);
    window.localStorage.setItem(getLocalSnapshotsKey(profile), JSON.stringify(snapshots));
  } catch {
    // Local storage is best-effort only.
  }
};

export class WeeklyDigestService {
  static async getSubscription(
    profile: Profile,
    target: WeeklyDigestTarget = {},
  ): Promise<WeeklyDigestSubscription | null> {
    if (!isSupabaseConfigured) return null;

    const scope = normalizeScope(profile, target.scope);
    const { data, error } = await getSupabaseClient()
      .from('weekly_digest_subscriptions')
      .select('*')
      .eq('user_id', profile.id)
      .eq('scope', scope)
      .order('updated_at', { ascending: false })
      .limit(30);

    if (error || !Array.isArray(data)) return null;

    const match = (data as SubscriptionRow[]).find((row) => matchesTarget(row, profile, { ...target, scope }));
    return match ? toSubscription(match) : null;
  }

  static async saveSubscription(
    profile: Profile,
    input: WeeklyDigestSubscriptionInput,
  ): Promise<WeeklyDigestSubscription | null> {
    const scope = normalizeScope(profile, input.scope);
    const childIds = input.childIds?.filter(Boolean) ?? [];
    const childId = scope === 'child' ? childIds[0] ?? null : null;
    const classId = scope === 'class' ? input.classId ?? null : null;
    const dayOfWeek = clampDay(input.dayOfWeek);
    const preferredHour = clampHour(input.preferredHour);
    const emailTo = normalizeEmail(input.emailTo);
    const now = new Date().toISOString();
    const payload = {
      user_id: profile.id,
      scope,
      child_id: childId,
      class_id: classId,
      frequency: input.frequency,
      delivery_method: input.deliveryMethod,
      enabled: input.enabled,
      email_to: emailTo,
      timezone: input.timezone || DEFAULT_TIMEZONE,
      day_of_week: dayOfWeek,
      preferred_hour: preferredHour,
      next_run_at: input.enabled ? calculateNextRunAt(dayOfWeek, preferredHour) : null,
      metadata: {
        target_child_ids: childIds,
        saved_from: 'adaptbuddy-web',
      },
    };

    if (!isSupabaseConfigured) {
      return {
        id: `local-subscription-${profile.id}-${scope}`,
        userId: profile.id,
        scope,
        childId,
        classId,
        frequency: input.frequency,
        deliveryMethod: input.deliveryMethod,
        enabled: input.enabled,
        emailTo,
        timezone: payload.timezone,
        dayOfWeek,
        preferredHour,
        lastGeneratedAt: null,
        nextRunAt: payload.next_run_at,
        metadata: payload.metadata,
        createdAt: now,
        updatedAt: now,
      };
    }

    const existing = await this.getSubscription(profile, { childIds, classId, scope });

    if (existing) {
      const { data, error } = await getSupabaseClient()
        .from('weekly_digest_subscriptions')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single();

      if (error) throw error;
      return data ? toSubscription(data as SubscriptionRow) : null;
    }

    const { data, error } = await getSupabaseClient()
      .from('weekly_digest_subscriptions')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data ? toSubscription(data as SubscriptionRow) : null;
  }

  static async getSnapshots(profile: Profile, limit = 5): Promise<WeeklyDigestSnapshot[]> {
    if (!isSupabaseConfigured) return readLocalSnapshots(profile).slice(0, limit);

    const { data, error } = await getSupabaseClient()
      .from('weekly_digest_snapshots')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.min(limit, 25)));

    if (error || !Array.isArray(data)) return readLocalSnapshots(profile).slice(0, limit);
    return (data as SnapshotRow[]).map(toSnapshot);
  }

  static async generateSnapshot(
    profile: Profile,
    options: WeeklyDigestGenerateOptions = {},
  ): Promise<WeeklyDigestSnapshot> {
    const scope = normalizeScope(profile, options.scope);
    const childIds = options.childIds?.filter(Boolean) ?? [];
    const [subscription, digest, evidencePack] = await Promise.all([
      this.getSubscription(profile, { ...options, childIds, scope }),
      BuddyDigestService.getDigest(profile, { childIds, scope, limit: scope === 'platform' ? 140 : 90 }),
      EvidencePackService.getPack(profile, { childIds, scope, limit: scope === 'platform' ? 18 : 12 }),
    ]);

    const now = new Date().toISOString();
    const status: WeeklyDigestSnapshotStatus = options.markEmailReady ? 'email_ready' : 'generated';
    const emailTo = normalizeEmail(subscription?.emailTo ?? profile.email);
    const emailSubject = `${digest.title}: ${digest.subjectName} (${digest.windowLabel})`;
    const payload = {
      subscription_id: subscription?.id?.startsWith('local-') ? null : subscription?.id ?? null,
      user_id: profile.id,
      scope,
      child_id: scope === 'child' ? childIds[0] ?? null : null,
      class_id: scope === 'class' ? options.classId ?? null : null,
      title: evidencePack.title,
      subject_name: evidencePack.subjectName,
      window_label: evidencePack.windowLabel,
      priority: evidencePack.priority,
      status,
      digest,
      evidence_pack: evidencePack,
      email_to: emailTo,
      email_subject: emailSubject,
      generated_at: now,
      scheduled_for: subscription?.nextRunAt ?? null,
      email_ready_at: status === 'email_ready' ? now : null,
      metadata: {
        target_child_ids: childIds,
        generated_from: 'adaptbuddy-web',
      },
    };

    if (!isSupabaseConfigured) {
      const snapshot: WeeklyDigestSnapshot = {
        id: `local-snapshot-${Date.now()}`,
        subscriptionId: null,
        userId: profile.id,
        scope,
        childId: payload.child_id,
        classId: payload.class_id,
        title: payload.title,
        subjectName: payload.subject_name,
        windowLabel: payload.window_label,
        priority: payload.priority,
        status,
        digest,
        evidencePack,
        emailTo,
        emailSubject,
        emailError: null,
        generatedAt: now,
        scheduledFor: payload.scheduled_for,
        emailReadyAt: payload.email_ready_at,
        emailedAt: null,
        metadata: payload.metadata,
        createdAt: now,
        updatedAt: now,
      };
      storeLocalSnapshot(profile, snapshot);
      return snapshot;
    }

    const { data, error } = await getSupabaseClient()
      .from('weekly_digest_snapshots')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;

    if (subscription && !subscription.id.startsWith('local-')) {
      await getSupabaseClient()
        .from('weekly_digest_subscriptions')
        .update({ last_generated_at: now })
        .eq('id', subscription.id);
    }

    return toSnapshot(data as SnapshotRow);
  }

  static async markSnapshotEmailReady(snapshotId: string): Promise<void> {
    if (!isSupabaseConfigured) return;

    const { error } = await getSupabaseClient()
      .from('weekly_digest_snapshots')
      .update({
        status: 'email_ready',
        email_ready_at: new Date().toISOString(),
      })
      .eq('id', snapshotId);

    if (error) throw error;
  }
}
