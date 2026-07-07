import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { LockFunc } from '@supabase/auth-js';

// Types
export type UserRole = 'child' | 'parent' | 'teacher' | 'admin';

export type UserSex = 'male' | 'female' | 'intersex' | 'prefer_not_to_say';

export type UserGender =
  | 'woman'
  | 'man'
  | 'non_binary'
  | 'other'
  | 'prefer_not_to_say';

export type UserStatus = 'active' | 'suspended' | 'pending';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  full_name: string;
  child_name?: string | null;
  buddy_id?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  age?: number | null;
  sex?: UserSex | null;
  gender?: UserGender | null;
  is_authorized?: boolean;
  status?: UserStatus;
  neuro_types: string[];
  onboarding_completed: boolean;
  companion_onboarding_completed?: boolean;
  email_verified_at?: string | null;
  created_at: string;
  updated_at: string;
}

/** Ensures neuro onboarding fields are always defined after a DB read. */
export function normalizeProfile(raw: Profile): Profile {
  return {
    ...raw,
    neuro_types: Array.isArray(raw.neuro_types) ? raw.neuro_types : [],
    onboarding_completed: raw.onboarding_completed === true,
    companion_onboarding_completed: raw.companion_onboarding_completed === true,
    is_authorized: raw.is_authorized !== false,
    status: raw.status ?? 'active',
  };
}

function resolveSupabaseEnv(): { url: string; key: string } | null {
  const url = process.env.REACT_APP_SUPABASE_URL?.trim();
  const key = process.env.REACT_APP_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  if (url.includes('YOUR_SUPABASE') || key.includes('YOUR_SUPABASE')) return null;

  return { url, key };
}

const supabaseEnv = resolveSupabaseEnv();

/** False when Vercel/local env vars are missing — app still renders in guest/marketing mode */
export const isSupabaseConfigured = supabaseEnv !== null;

let supabaseInstance: SupabaseClient | null = null;
let supabaseAuthLock = Promise.resolve();

const inAppAuthLock: LockFunc = async (_name, _acquireTimeout, fn) => {
  const previous = supabaseAuthLock;
  let release: () => void;
  supabaseAuthLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    return await fn();
  } finally {
    release!();
  }
};

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseEnv) {
    throw new Error(
      'Supabase is not configured. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY to your environment.',
    );
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseEnv.url, supabaseEnv.key, {
      auth: {
        lock: inAppAuthLock,
      },
    });
  }
  return supabaseInstance;
}

export const getCurrentUser = async () => {
  if (!isSupabaseConfigured) return null;
  const { data: { user } } = await getSupabaseClient().auth.getUser();
  return user;
};

export const getProfile = async (userId: string) => {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return normalizeProfile(data as Profile);
};

export const signOut = async () => {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw error;
};
