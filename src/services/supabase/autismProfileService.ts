import { getSupabaseClient, isSupabaseConfigured } from './client';
import type { AutismProfile } from 'features/child/types/autismProfile';
import type { EmotionAnalysis, RiskLevel } from 'types/ai.types';

export type TrustedAdultStatus = 'active' | 'connected' | 'pending';

export interface TrustedAdultInput {
  name: string;
  role: string;
  email: string;
  phone: string;
}

export interface TrustedAdultRecord extends TrustedAdultInput {
  id: string;
  status: TrustedAdultStatus;
}

interface TrustedAdultRow {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: string;
}

const normalizeTrustedAdultStatus = (status: string): TrustedAdultStatus => {
  if (status === 'active' || status === 'connected' || status === 'pending') return status;
  return 'pending';
};

const mapTrustedAdultRow = (row: TrustedAdultRow): TrustedAdultRecord => ({
  id: row.id,
  name: row.name,
  role: row.role,
  email: row.email,
  phone: row.phone,
  status: normalizeTrustedAdultStatus(row.status),
});

export interface AutismProfileRow {
  id: string;
  child_id: string;
  profile_data: AutismProfile;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchAutismProfile(childId: string): Promise<AutismProfile | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await getSupabaseClient()
    .from('autism_profiles')
    .select('profile_data')
    .eq('child_id', childId)
    .maybeSingle();

  if (error) throw error;
  return (data?.profile_data as AutismProfile | undefined) ?? null;
}

export async function saveAutismProfile(
  childId: string,
  profile: AutismProfile,
): Promise<AutismProfile> {
  const row = {
    child_id: childId,
    profile_data: { ...profile, childId },
    completed_at: profile.completedAt,
  };

  if (!isSupabaseConfigured) return profile;

  const { data, error } = await getSupabaseClient()
    .from('autism_profiles')
    .upsert(row, { onConflict: 'child_id' })
    .select('profile_data')
    .single();

  if (error) throw error;
  return data.profile_data as AutismProfile;
}

export async function saveMoodCheckIn(
  childId: string,
  mood: string,
  note: string,
  aiResponse?: string,
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { error } = await getSupabaseClient().from('mood_check_ins').insert({
    child_id: childId,
    mood,
    note: note.trim() || null,
    ai_response: aiResponse ?? null,
  });

  if (error) throw error;
}

export async function fetchTrustedAdultsForChild(childId: string): Promise<TrustedAdultRecord[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await getSupabaseClient()
    .from('trusted_adults')
    .select('id, name, role, email, phone, status')
    .eq('child_id', childId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as TrustedAdultRow[]).map(mapTrustedAdultRow);
}

export async function saveTrustedAdultForChild(
  childId: string,
  adult: TrustedAdultInput,
): Promise<TrustedAdultRecord> {
  if (!isSupabaseConfigured) {
    return {
      ...adult,
      id: `trusted-${Date.now()}`,
      status: 'pending',
    };
  }

  const client = getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError) throw userError;
  if (!user || user.id !== childId) {
    throw new Error('You need to be signed in as this child to add a trusted adult.');
  }

  const { data, error } = await client.rpc('add_trusted_adult_for_child', {
    p_name: adult.name,
    p_role: adult.role,
    p_email: adult.email,
    p_phone: adult.phone,
  });

  if (error) throw error;
  return mapTrustedAdultRow(data as TrustedAdultRow);
}

export interface JournalEntryInput {
  childId: string;
  emotion: string;
  text: string;
  analysis?: EmotionAnalysis | null;
  audioUrl?: string | null;
  isShared?: boolean;
}

const toSerializableAnalysis = (analysis?: EmotionAnalysis | null) => {
  if (!analysis) return null;

  return {
    ...analysis,
    timestamp:
      analysis.timestamp instanceof Date
        ? analysis.timestamp.toISOString()
        : analysis.timestamp,
  };
};

const signalColorForEmotion = (emotion: string): string => {
  switch (emotion.toLowerCase()) {
    case 'happy':
    case 'excited':
    case 'good':
      return 'green';
    case 'calm':
    case 'okay':
      return 'blue';
    case 'tired':
      return 'purple';
    case 'sad':
    case 'anxious':
    case 'worried':
    case 'too noisy':
    case 'too bright':
    case 'confused':
      return 'yellow';
    case 'frustrated':
      return 'orange';
    case 'angry':
    case 'i need help':
      return 'red';
    default:
      return 'blue';
  }
};

const signalColorForAnalysis = (analysis: EmotionAnalysis | null | undefined, emotion: string): string => {
  if (analysis?.supportLevel === 'urgent') return 'red';
  if (typeof analysis?.signalLabel === 'string') return signalColorForEmotion(analysis.signalLabel);
  if (analysis?.signalCategory === 'sensory' || analysis?.signalCategory === 'cognitive') return 'yellow';
  if (analysis?.supportLevel === 'concern') return 'yellow';
  return signalColorForEmotion(emotion);
};

const deriveSupportRiskLevel = (
  analysis: EmotionAnalysis | null | undefined,
  emotion: string,
  text: string,
): RiskLevel => {
  if (analysis?.riskLevel === 'high' || analysis?.supportLevel === 'urgent') return 'high';

  const signalText = [
    analysis?.signalLabel,
    analysis?.signalCategory,
    analysis?.supportLevel,
    analysis?.emotion,
    emotion,
    text,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/\bi need help\b|\bneed help\b|\bhelp me\b|\bplease help\b/.test(signalText)) {
    return 'high';
  }

  if (
    analysis?.riskLevel === 'medium'
    || analysis?.supportLevel === 'concern'
    || analysis?.signalCategory === 'sensory'
    || analysis?.signalCategory === 'cognitive'
    || /too noisy|too bright|confused|worried|frustrated|overwhelmed|stuck|scared/.test(signalText)
  ) {
    return 'medium';
  }

  return analysis?.riskLevel ?? 'low';
};

export async function saveJournalEntry({
  childId,
  emotion,
  text,
  analysis,
  audioUrl = null,
  isShared = true,
}: JournalEntryInput): Promise<void> {
  if (!isSupabaseConfigured) return;

  const client = getSupabaseClient();
  const riskLevel = deriveSupportRiskLevel(analysis, emotion, text);

  const { data, error } = await client
    .from('journal_entries')
    .insert({
      child_id: childId,
      emotion,
      text: text.trim() || null,
      audio_url: audioUrl,
      ai_analysis: toSerializableAnalysis(analysis),
      risk_level: riskLevel,
      is_shared: isShared,
    })
    .select('id')
    .single();

  if (error) throw error;

  const { error: signalError } = await client.from('parent_child_signals').insert({
    child_id: childId,
    emotion: analysis?.signalLabel ?? analysis?.emotion ?? emotion,
    color: signalColorForAnalysis(analysis, analysis?.emotion ?? emotion),
    note: analysis?.parentInsight
      ? `${analysis.parentInsight}${text.trim() ? ` ${text.trim()}` : ''}`
      : text.trim() || null,
  });

  if (signalError) throw signalError;

  if (riskLevel === 'medium' || riskLevel === 'high') {
    const { error: alertError } = await client.from('alerts').insert({
      child_id: childId,
      journal_entry_id: data.id,
      risk_level: riskLevel,
    });

    if (alertError) throw alertError;
  }
}

export async function fetchRecentMoodCheckIns(
  childId: string,
  limit = 7,
): Promise<{ mood: string; note: string | null; ai_response: string | null; created_at: string }[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await getSupabaseClient()
    .from('mood_check_ins')
    .select('mood, note, ai_response, created_at')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
