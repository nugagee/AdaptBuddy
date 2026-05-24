import { getSupabaseClient, type Profile } from './client';
import { buildFallbackProfileFromUser } from './authService';
import { toProfileErrorMessage } from './profileErrors';

export interface ProfileUpdatePayload {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  bio?: string | null;
  age?: number | null;
  avatar_url?: string | null;
  neuro_types?: string[];
  onboarding_completed?: boolean;
  child_name?: string | null;
}

function profileToRow(profile: Profile, overrides: ProfileUpdatePayload = {}) {
  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    first_name: profile.first_name,
    last_name: profile.last_name,
    full_name: profile.full_name,
    child_name: profile.child_name ?? null,
    bio: profile.bio ?? null,
    age: profile.age ?? null,
    avatar_url: profile.avatar_url ?? null,
    neuro_types: profile.neuro_types ?? [],
    onboarding_completed: profile.onboarding_completed ?? false,
    ...overrides,
  };
}

async function resolveProfileForUpsert(
  userId: string,
  existingProfile?: Profile | null,
): Promise<Profile> {
  if (existingProfile?.id === userId) return existingProfile;

  const { data: { user }, error } = await getSupabaseClient().auth.getUser();
  if (error) throw error;
  if (!user || user.id !== userId) {
    throw new Error('You need to be signed in to save your profile.');
  }

  return buildFallbackProfileFromUser(user);
}

export async function updateUserProfile(
  userId: string,
  payload: ProfileUpdatePayload,
  existingProfile?: Profile | null,
): Promise<Profile> {
  const updates: Record<string, unknown> = { ...payload };

  if (payload.first_name !== undefined || payload.last_name !== undefined) {
    const first = payload.first_name ?? '';
    const last = payload.last_name ?? '';
    updates.full_name = payload.full_name ?? `${String(first).trim()} ${String(last).trim()}`.trim();
  }

  delete updates.id;

  const client = getSupabaseClient();

  const { data, error } = await client
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(toProfileErrorMessage(error));
  }

  if (data) return data as Profile;

  const profile = await resolveProfileForUpsert(userId, existingProfile);
  const row = profileToRow(profile, payload);

  const { data: upserted, error: upsertError } = await client
    .from('profiles')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (upsertError) {
    throw new Error(toProfileErrorMessage(upsertError));
  }

  return upserted as Profile;
}

export async function saveNeuroSelection(
  userId: string,
  neuroTypes: string[],
  markOnboardingComplete = true,
  existingProfile?: Profile | null,
): Promise<Profile> {
  return updateUserProfile(
    userId,
    {
      neuro_types: neuroTypes,
      onboarding_completed: markOnboardingComplete,
    },
    existingProfile,
  );
}

export async function uploadProfileAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await getSupabaseClient()
    .storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = getSupabaseClient().storage.from('avatars').getPublicUrl(path);
  const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

  await updateUserProfile(userId, { avatar_url: publicUrl });
  return publicUrl;
}
