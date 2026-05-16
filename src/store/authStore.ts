import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import {
  getProfile,
  getSupabaseClient,
  isSupabaseConfigured,
  type Profile,
  type UserRole,
} from 'services/supabase/client';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isGuest: boolean;
  initialized: boolean;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  setGuestMode: () => void;
  initialize: () => () => void;
}

const loadProfile = async (userId: string) => {
  try {
    return await getProfile(userId);
  } catch (error) {
    console.error('Failed to load profile:', error);
    return null;
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  isGuest: false,
  initialized: false,

  signIn: async (email, password) => {
    if (!isSupabaseConfigured) throw new Error('Authentication is not configured on this deployment.');
    const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signUp: async (email, password, fullName, role) => {
    const { data: { user }, error } = await getSupabaseClient().auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
    if (error) throw error;
    if (user) console.log('User created:', user.id);
  },

  signInWithGoogle: async () => {
    const { error } = await getSupabaseClient().auth.signInWithOAuth({ provider: 'google' });
    if (error) throw error;
  },

  signInWithApple: async () => {
    const { error } = await getSupabaseClient().auth.signInWithOAuth({ provider: 'apple' });
    if (error) throw error;
  },

  resetPassword: async (email) => {
    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  signOut: async () => {
    if (!isSupabaseConfigured) {
      set({ user: null, profile: null, isGuest: false });
      return;
    }
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw error;
    set({ user: null, profile: null, isGuest: false });
  },

  setGuestMode: () => {
    set({ isGuest: true, user: null, profile: null, loading: false });
  },

  initialize: () => {
    if (!isSupabaseConfigured) {
      set({ initialized: true, loading: false, user: null, profile: null });
      return () => {
        set({ initialized: false });
      };
    }

    const applySession = async (sessionUser: User | null) => {
      if (!sessionUser) {
        set({ user: null, profile: null, loading: false });
        return;
      }
      const profile = await loadProfile(sessionUser.id);
      set({ user: sessionUser, profile, loading: false, isGuest: false });
    };

    set({ initialized: true, loading: true });

    getSupabaseClient().auth.getSession().then(({ data: { session } }) => {
      applySession(session?.user ?? null);
    });

    const { data: { subscription } } = getSupabaseClient().auth.onAuthStateChange(
      async (_event, session) => {
        await applySession(session?.user ?? null);
      },
    );

    return () => {
      subscription.unsubscribe();
      set({ initialized: false });
    };
  },
}));
