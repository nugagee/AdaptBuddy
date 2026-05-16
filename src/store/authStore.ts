import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase, getProfile, type Profile, type UserRole } from 'services/supabase/client';

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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signUp: async (email, password, fullName, role) => {
    const { data: { user }, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
    if (error) throw error;
    if (user) console.log('User created:', user.id);
  },

  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) throw error;
  },

  signInWithApple: async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'apple' });
    if (error) throw error;
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ user: null, profile: null, isGuest: false });
  },

  setGuestMode: () => {
    set({ isGuest: true, user: null, profile: null, loading: false });
  },

  initialize: () => {
    const applySession = async (sessionUser: User | null) => {
      if (!sessionUser) {
        set({ user: null, profile: null, loading: false });
        return;
      }
      const profile = await loadProfile(sessionUser.id);
      set({ user: sessionUser, profile, loading: false, isGuest: false });
    };

    set({ initialized: true, loading: true });

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await applySession(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
      set({ initialized: false });
    };
  },
}));
