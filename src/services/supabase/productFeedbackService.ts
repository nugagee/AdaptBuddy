import { getSupabaseClient, isSupabaseConfigured, type Profile, type UserRole } from 'services/supabase/client';

export type ProductFeedbackType = 'idea' | 'confusing' | 'bug' | 'safety' | 'delight';
export type ProductFeedbackSentiment = 'positive' | 'neutral' | 'concerned';
export type ProductFeedbackStatus = 'new' | 'reviewing' | 'planned' | 'shipped' | 'closed';

export interface ProductFeedbackInput {
  sourceArea: string;
  feedbackType: ProductFeedbackType;
  rating: number;
  feedbackText: string;
  childId?: string | null;
  metadata?: Record<string, unknown>;
  isGuest?: boolean;
  visitorKey?: string;
  submitterName?: string;
  submitterEmail?: string;
  buddyId?: string | null;
  path?: string;
}

export interface ProductFeedbackSubmitResult {
  persisted: boolean;
  reason?: string;
}

export interface ProductFeedbackTheme {
  theme: string;
  count: number;
  sentiment: ProductFeedbackSentiment;
}

export interface ProductFeedbackSummary {
  total: number;
  averageRating: number | null;
  byType: Record<ProductFeedbackType, number>;
  bySentiment: Record<ProductFeedbackSentiment, number>;
  themes: ProductFeedbackTheme[];
  latest: ProductFeedbackItem[];
}

export interface ProductFeedbackItem {
  id: string;
  userId?: string | null;
  userRole: UserRole;
  sourceArea: string;
  feedbackType: ProductFeedbackType;
  rating: number;
  feedbackText: string;
  sentiment: ProductFeedbackSentiment;
  themes: string[];
  status: ProductFeedbackStatus;
  metadata: Record<string, unknown>;
  submitterName?: string;
  submitterEmail?: string;
  visitorKey?: string;
  isGuest?: boolean;
  buddyId?: string | null;
  path?: string | null;
  adminResponse?: string | null;
  adminRespondedAt?: string | null;
  adminRespondedBy?: string | null;
  createdAt: string;
}

interface ProductFeedbackRow {
  id: string;
  user_id?: string | null;
  user_role?: UserRole | null;
  source_area?: string | null;
  feedback_type?: ProductFeedbackType | null;
  rating?: number | null;
  feedback_text?: string | null;
  sentiment?: ProductFeedbackSentiment | null;
  themes?: unknown;
  status?: ProductFeedbackStatus | null;
  metadata?: unknown;
  submitter_name?: string | null;
  submitter_email?: string | null;
  visitor_key?: string | null;
  is_guest?: boolean | null;
  buddy_id?: string | null;
  path?: string | null;
  admin_response?: string | null;
  admin_responded_at?: string | null;
  admin_responded_by?: string | null;
  created_at?: string | null;
  profiles?: {
    full_name?: string | null;
    email?: string | null;
    buddy_id?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    child_name?: string | null;
  } | Array<{
    full_name?: string | null;
    email?: string | null;
    buddy_id?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    child_name?: string | null;
  }> | null;
}

const feedbackTypes: ProductFeedbackType[] = ['idea', 'confusing', 'bug', 'safety', 'delight'];
const sentiments: ProductFeedbackSentiment[] = ['positive', 'neutral', 'concerned'];
const LOCAL_FEEDBACK_KEY = 'adaptbuddy-product-feedback-buffer';

const themeRules: { theme: string; match: RegExp }[] = [
  { theme: 'Accessibility', match: /accessib|font|contrast|read aloud|voice|speech|listen|visual|sensory/ },
  { theme: 'Child experience', match: /child|learner|young|calm|music|journal|mood|timer|task|now|next|later/ },
  { theme: 'Parent dashboard', match: /parent|family|home|guardian|trusted adult/ },
  { theme: 'Teacher workflow', match: /teacher|school|class|assignment|student|senco|report/ },
  { theme: 'Privacy & safeguarding', match: /privacy|safe|safeguard|alert|risk|consent|approval|hidden/ },
  { theme: 'AI support', match: /ai|suggest|summary|digest|coach|recommend|report/ },
  { theme: 'Onboarding', match: /login|sign in|signup|onboard|profile|buddy id|connect/ },
  { theme: 'Design polish', match: /beautiful|design|card|colour|color|layout|confusing|clear|button/ },
  { theme: 'Performance', match: /slow|fast|loading|lag|crash|broken|bug|error|not working/ },
];

function clampRating(value: number): number {
  if (!Number.isFinite(value)) return 4;
  return Math.min(5, Math.max(1, Math.round(value)));
}

function normalizeFeedbackType(value: ProductFeedbackType): ProductFeedbackType {
  return feedbackTypes.includes(value) ? value : 'idea';
}

function normalizeSentiment(value: unknown): ProductFeedbackSentiment {
  return sentiments.includes(value as ProductFeedbackSentiment) ? (value as ProductFeedbackSentiment) : 'neutral';
}

function inferSentiment(text: string, type: ProductFeedbackType, rating: number): ProductFeedbackSentiment {
  const lower = text.toLowerCase();
  if (
    type === 'safety'
    || type === 'bug'
    || rating <= 2
    || /unsafe|risk|worried|concern|broken|error|confusing|stuck|can't|cannot|doesn't work|not working/.test(lower)
  ) {
    return 'concerned';
  }
  if (type === 'delight' || rating >= 5 || /love|great|beautiful|helpful|perfect|fantastic|works|clear/.test(lower)) {
    return 'positive';
  }
  return 'neutral';
}

function extractThemes(text: string, sourceArea: string, feedbackType: ProductFeedbackType): string[] {
  const lower = `${sourceArea} ${feedbackType} ${text}`.toLowerCase();
  const themes = themeRules.filter((rule) => rule.match.test(lower)).map((rule) => rule.theme);
  return Array.from(new Set(themes.length ? themes : ['General experience'])).slice(0, 5);
}

function asThemeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function asMetadata(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toItem(row: ProductFeedbackRow): ProductFeedbackItem {
  const profileJoin = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const profile = profileJoin;
  const meta = asMetadata(row.metadata);
  const metaSubmitter = asMetadata(meta.submitter);
  const submitterName =
    row.submitter_name
    || (typeof metaSubmitter.name === 'string' ? metaSubmitter.name : '')
    || profile?.full_name
    || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
    || '';
  const submitterEmail =
    row.submitter_email
    || (typeof metaSubmitter.email === 'string' ? metaSubmitter.email : '')
    || profile?.email
    || '';
  const buddyId =
    row.buddy_id
    || (typeof metaSubmitter.buddyId === 'string' ? metaSubmitter.buddyId : null)
    || profile?.buddy_id
    || null;
  const visitorKey =
    row.visitor_key
    || (typeof meta.visitorKey === 'string' ? meta.visitorKey : '')
    || '';
  const isGuest = Boolean(
    row.is_guest
    || meta.isGuest === true
    || metaSubmitter.accountType === 'guest',
  );

  return {
    id: row.id,
    userId: row.user_id ?? null,
    userRole: row.user_role ?? 'parent',
    sourceArea: row.source_area ?? 'general',
    feedbackType: row.feedback_type ?? 'idea',
    rating: clampRating(row.rating ?? 4),
    feedbackText: row.feedback_text ?? '',
    sentiment: normalizeSentiment(row.sentiment),
    themes: asThemeArray(row.themes),
    status: row.status ?? 'new',
    metadata: meta,
    submitterName,
    submitterEmail,
    visitorKey,
    isGuest,
    buddyId,
    path: row.path || (typeof meta.path === 'string' ? meta.path : null),
    adminResponse: row.admin_response ?? null,
    adminRespondedAt: row.admin_responded_at ?? null,
    adminRespondedBy: row.admin_responded_by ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function emptySummary(): ProductFeedbackSummary {
  return {
    total: 0,
    averageRating: null,
    byType: { idea: 0, confusing: 0, bug: 0, safety: 0, delight: 0 },
    bySentiment: { positive: 0, neutral: 0, concerned: 0 },
    themes: [],
    latest: [],
  };
}

function buildSummary(items: ProductFeedbackItem[]): ProductFeedbackSummary {
  const summary = emptySummary();
  summary.total = items.length;
  summary.latest = items.slice(0, 8);
  summary.averageRating = items.length
    ? Number((items.reduce((total, item) => total + item.rating, 0) / items.length).toFixed(1))
    : null;

  const themeCounts = new Map<string, ProductFeedbackTheme>();

  items.forEach((item) => {
    summary.byType[item.feedbackType] += 1;
    summary.bySentiment[item.sentiment] += 1;
    item.themes.forEach((theme) => {
      const current = themeCounts.get(theme);
      if (current) {
        current.count += 1;
        if (item.sentiment === 'concerned') current.sentiment = 'concerned';
        else if (item.sentiment === 'positive' && current.sentiment === 'neutral') current.sentiment = 'positive';
        return;
      }
      themeCounts.set(theme, { theme, count: 1, sentiment: item.sentiment });
    });
  });

  summary.themes = Array.from(themeCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return summary;
}

function storeLocalFeedback(profile: Profile, input: ProductFeedbackInput, sentiment: ProductFeedbackSentiment, themes: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = JSON.parse(window.localStorage.getItem(LOCAL_FEEDBACK_KEY) ?? '[]') as unknown[];
    const next = [
      {
        id: crypto.randomUUID?.() ?? `local-${Date.now()}`,
        user_id: input.isGuest ? null : profile.id,
        user_role: profile.role,
        source_area: input.sourceArea,
        feedback_type: input.feedbackType,
        rating: clampRating(input.rating),
        feedback_text: input.feedbackText.trim(),
        sentiment,
        themes,
        status: 'new',
        metadata: input.metadata ?? {},
        submitter_name: input.submitterName || profile.full_name || '',
        submitter_email: input.submitterEmail || profile.email || '',
        visitor_key: input.visitorKey || '',
        is_guest: Boolean(input.isGuest),
        buddy_id: input.buddyId || profile.buddy_id || null,
        path: input.path || '/',
        created_at: new Date().toISOString(),
      },
      ...existing,
    ].slice(0, 40);
    window.localStorage.setItem(LOCAL_FEEDBACK_KEY, JSON.stringify(next));
  } catch {
    // Local feedback is best-effort only.
  }
}

function readLocalFeedback(): ProductFeedbackItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const rows = JSON.parse(window.localStorage.getItem(LOCAL_FEEDBACK_KEY) ?? '[]');
    return Array.isArray(rows) ? rows.map((row) => toItem(row as ProductFeedbackRow)) : [];
  } catch {
    return [];
  }
}

export class ProductFeedbackService {
  static async submitFeedback(profile: Profile, input: ProductFeedbackInput): Promise<ProductFeedbackSubmitResult> {
    const feedbackText = input.feedbackText.trim();
    if (!feedbackText) return { persisted: false, reason: 'Feedback text is empty.' };

    const feedbackType = normalizeFeedbackType(input.feedbackType);
    const rating = clampRating(input.rating);
    const sentiment = inferSentiment(feedbackText, feedbackType, rating);
    const themes = extractThemes(feedbackText, input.sourceArea, feedbackType);
    const isGuest = Boolean(input.isGuest);
    const submitterName = (input.submitterName || profile.full_name || '').trim();
    const submitterEmail = (input.submitterEmail || profile.email || '').trim();
    const visitorKey = (input.visitorKey || '').trim();
    const buddyId = input.buddyId || profile.buddy_id || null;
    const path = input.path || '/';
    const metadata = {
      ...(input.metadata ?? {}),
      isGuest,
      visitorKey,
      path,
      submitter: {
        ...asMetadata((input.metadata ?? {}).submitter),
        name: submitterName,
        email: submitterEmail,
        buddyId,
        userId: isGuest ? null : profile.id,
        accountType: isGuest ? 'guest' : 'authenticated',
      },
    };

    if (!isSupabaseConfigured) {
      storeLocalFeedback(
        profile,
        {
          ...input,
          feedbackType,
          rating,
          feedbackText,
          submitterName,
          submitterEmail,
          visitorKey,
          buddyId,
          path,
          isGuest,
          metadata,
        },
        sentiment,
        themes,
      );
      return { persisted: false, reason: 'Supabase is not configured.' };
    }

    const { error } = await getSupabaseClient().rpc('submit_product_feedback', {
      p_data: {
        user_id: isGuest ? null : profile.id,
        user_role: profile.role,
        child_id: input.childId ?? null,
        source_area: input.sourceArea,
        feedback_type: feedbackType,
        rating,
        feedback_text: feedbackText,
        sentiment,
        themes,
        metadata,
        is_guest: isGuest,
        submitter_name: submitterName,
        submitter_email: submitterEmail,
        visitor_key: visitorKey,
        buddy_id: buddyId,
        path,
      },
    });

    if (error) {
      storeLocalFeedback(
        profile,
        {
          ...input,
          feedbackType,
          rating,
          feedbackText,
          submitterName,
          submitterEmail,
          visitorKey,
          buddyId,
          path,
          isGuest,
          metadata,
        },
        sentiment,
        themes,
      );
      return { persisted: false, reason: error.message };
    }

    return { persisted: true };
  }

  static async getSummary(profile: Profile): Promise<ProductFeedbackSummary> {
    const localSummary = buildSummary(readLocalFeedback());

    if (!isSupabaseConfigured) return localSummary;

    const items = await this.getFeedbackItems(profile, profile.role === 'admin' ? 250 : 40);
    return buildSummary(items.length ? items : localSummary.latest);
  }

  static async getFeedbackItems(profile: Profile, limit = 250): Promise<ProductFeedbackItem[]> {
    const localItems = readLocalFeedback();

    if (!isSupabaseConfigured) return localItems;

    let query = getSupabaseClient()
      .from('product_feedback')
      .select('id, user_id, user_role, source_area, feedback_type, rating, feedback_text, sentiment, themes, status, metadata, submitter_name, submitter_email, visitor_key, is_guest, buddy_id, path, admin_response, admin_responded_at, admin_responded_by, created_at, profiles:user_id(full_name, email, buddy_id, first_name, last_name, child_name)')
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.min(limit, 500)));

    if (profile.role !== 'admin') {
      query = query.eq('user_id', profile.id);
    }

    const { data, error } = await query;
    if (error || !Array.isArray(data)) return localItems;

    return (data as ProductFeedbackRow[]).map(toItem);
  }

  static async updateFeedbackStatus(
    profile: Profile,
    feedbackId: string,
    status: ProductFeedbackStatus,
  ): Promise<void> {
    if (profile.role !== 'admin') throw new Error('Only admins can update feedback status.');
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

    const { error } = await getSupabaseClient()
      .from('product_feedback')
      .update({ status })
      .eq('id', feedbackId);

    if (error) throw error;
  }

  static async respondToFeedback(
    profile: Profile,
    feedbackId: string,
    responseText: string,
    status: ProductFeedbackStatus = 'reviewing',
  ): Promise<void> {
    if (profile.role !== 'admin') throw new Error('Only admins can respond to feedback.');
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

    const adminResponse = responseText.trim();
    if (!adminResponse) throw new Error('Please write a short reply before sending.');

    const { error } = await getSupabaseClient()
      .from('product_feedback')
      .update({
        admin_response: adminResponse,
        admin_responded_at: new Date().toISOString(),
        admin_responded_by: profile.id,
        status,
      })
      .eq('id', feedbackId);

    if (error) throw error;
  }
}
