import { getSupabaseClient, isSupabaseConfigured } from './client';
import type { AutismProfile } from 'features/child/types/autismProfile';

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
