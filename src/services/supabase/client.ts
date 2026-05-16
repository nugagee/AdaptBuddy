import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Types
export type UserRole = 'child' | 'parent' | 'teacher';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  avatar_url?: string;
  created_at: string;
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

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseEnv) {
    throw new Error(
      'Supabase is not configured. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY to your environment.',
    );
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseEnv.url, supabaseEnv.key);
  }
  return supabaseInstance;
}

/** @deprecated Prefer getSupabaseClient() after checking isSupabaseConfigured */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient() as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

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
  return data as Profile;
};

export const signOut = async () => {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw error;
};
