import { TRUSTED_ADULT_INVITATIONS_ENABLED, SUPPORT_RECORDING_ENABLED } from 'constants/releaseCapabilities';
import { getSupabaseClient, isSupabaseConfigured } from './client';
import type { AutismProfile } from 'features/child/types/autismProfile';
import type { EmotionAnalysis, RiskLevel } from 'types/ai.types';

export type TrustedAdultStatus = 'active' | 'connected' | 'pending' | 'declined' | 'revoked' | 'expired';

export interface TrustedAdultInput {
  name: string;
  role: string;
  email: string;
  phone: string;
}

export interface TrustedAdultRecord extends TrustedAdultInput {
  id: string;
  status: TrustedAdultStatus;
  child_name?: string;
  expires_at?: string;
}

interface TrustedAdultRow {
  id: string;
  adult_id?: string | null;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: string;
  accepted_at?: string | null;
  accepted_by?: string | null;
  acceptance_method?: string | null;
  child_name?: string;
  expires_at?: string;
}

const normalizeTrustedAdultStatus = (status: string): TrustedAdultStatus => {
  if (status === 'active' || status === 'connected' || status === 'pending' || status === 'declined' || status === 'revoked' || status === 'expired') return status;
  return 'pending';
};

const mapTrustedAdultRow = (row: TrustedAdultRow): TrustedAdultRecord => ({
  id: row.id,
  name: row.name,
  role: row.role,
  email: row.email,
  phone: row.phone,
  child_name: row.child_name,
  expires_at: row.expires_at,
  status: ['declined', 'revoked', 'expired'].includes(row.status)
    ? normalizeTrustedAdultStatus(row.status)
    : row.accepted_at
      && row.adult_id
      && row.accepted_by === row.adult_id
      && row.acceptance_method === 'account_email'
    ? normalizeTrustedAdultStatus(row.status)
    : 'pending',
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
  isShared = false,
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { error } = await getSupabaseClient().from('mood_check_ins').insert({
    child_id: childId,
    mood,
    note: note.trim() || null,
    ai_response: aiResponse ?? null,
    is_shared: isShared,
  });

  if (error) throw error;
}

export async function fetchTrustedAdultsForChild(childId: string): Promise<TrustedAdultRecord[]> {
  if (!TRUSTED_ADULT_INVITATIONS_ENABLED) throw new Error('Trusted-adult connections are temporarily unavailable.');
  if (!isSupabaseConfigured) return [];

  const client = getSupabaseClient();
  const { data: { user } } = await client.auth.getUser();
  if (user?.id !== childId) throw new Error('Sign in as this child to view support connections.');
  const { data, error } = await client.rpc('list_trusted_support_contacts_v1');

  if (error) throw error;
  return ((data ?? []) as TrustedAdultRow[]).map(mapTrustedAdultRow);
}

export async function saveTrustedAdultForChild(
  childId: string,
  adult: TrustedAdultInput,
): Promise<TrustedAdultRecord> {
  if (!TRUSTED_ADULT_INVITATIONS_ENABLED) throw new Error('Trusted-adult requests are temporarily unavailable. No request was recorded.');
  if (!isSupabaseConfigured) {
    throw new Error('Trusted-adult invitations are unavailable because secure storage is not configured.');
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

  const { data, error } = await client.rpc('create_trusted_support_invitation_v1', {
    p_child_id: childId,
    p_name: adult.name,
    p_role: adult.role,
    p_email: adult.email,
    p_phone: adult.phone,
  });

  if (error) throw new Error('Trusted-adult requests are unavailable right now. No request was recorded.');
  if (!data || data.status !== 'pending' || data.adult_id || data.accepted_at || data.accepted_by) {
    throw new Error('The server could not confirm a pending-only request. Contact support before trying again.');
  }
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
  isShared = false,
}: JournalEntryInput): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('This support entry was not saved because secure storage is not configured.');
  }

  if (isShared) throw new Error('Sharing journal entries is unavailable. No adult was contacted.');
  const client = getSupabaseClient();
  const riskLevel = deriveSupportRiskLevel(analysis, emotion, text);

  const { error } = await client
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

}

export async function requestTrustedAdultSupport(
  childId: string,
  source: 'buddy-conversation' | 'mood-check-in' | 'child-dashboard',
  urgent = false,
  requestId = crypto.randomUUID(),
  contactId: string | null = null,
): Promise<void> {
  if (!SUPPORT_RECORDING_ENABLED) throw new Error('Support recording is temporarily unavailable. No adult was contacted.');
  if (!isSupabaseConfigured) throw new Error('Secure support recording is unavailable.');
  const client = getSupabaseClient();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || user?.id !== childId) throw new Error('Sign in as this child to record a support request.');
  const { data, error } = await client.rpc('record_trusted_support_request_v1', {
    p_child_id: childId, p_request_id: requestId, p_source: source, p_urgent: urgent, p_contact_id: contactId,
  });
  if (error || !data) throw new Error('The support record could not be confirmed. Check your support history or retry with the same request.');
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

export interface SupportRequestRecord {
  id: string;
  child_name: string;
  contact_id: string | null;
  adult_name: string | null;
  source: string;
  urgent: boolean;
  created_at: string;
  seen_at: string | null;
  connection_active: boolean;
}

export async function fetchAdultSupportInvitations(): Promise<TrustedAdultRecord[]> {
  if (!TRUSTED_ADULT_INVITATIONS_ENABLED || !isSupabaseConfigured) throw new Error('Support invitations are unavailable.');
  const { data, error } = await getSupabaseClient().rpc('list_trusted_support_contacts_v1');
  if (error) throw error;
  return ((data ?? []) as TrustedAdultRow[]).map(mapTrustedAdultRow);
}

export async function respondToSupportInvitation(invitationId: string, accept: boolean, isAdult = false): Promise<void> {
  if (!TRUSTED_ADULT_INVITATIONS_ENABLED || !isSupabaseConfigured) throw new Error('Support invitations are unavailable.');
  const { error } = await getSupabaseClient().rpc('respond_trusted_support_invitation_v1', {
    p_invitation_id: invitationId, p_accept: accept, p_is_adult: isAdult,
  });
  if (error) throw error;
}

export async function revokeSupportContact(contactId: string): Promise<void> {
  if (!TRUSTED_ADULT_INVITATIONS_ENABLED || !isSupabaseConfigured) throw new Error('Support connections are unavailable.');
  const { error } = await getSupabaseClient().rpc('revoke_trusted_support_contact_v1', { p_contact_id: contactId });
  if (error) throw error;
}

export async function fetchSupportRequests(): Promise<SupportRequestRecord[]> {
  if (!SUPPORT_RECORDING_ENABLED || !isSupabaseConfigured) throw new Error('Support history is unavailable.');
  const { data, error } = await getSupabaseClient().rpc('list_trusted_support_requests_v1');
  if (error) throw error;
  return data ?? [];
}

export async function acknowledgeSupportRequest(requestId: string): Promise<void> {
  if (!SUPPORT_RECORDING_ENABLED || !isSupabaseConfigured) throw new Error('Support recording is unavailable.');
  const { error } = await getSupabaseClient().rpc('acknowledge_trusted_support_request_v1', { p_request_id: requestId });
  if (error) throw error;
}
