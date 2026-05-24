import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import type { AuthSessionState } from 'types/auth';
import {
  getProfile,
  getSupabaseClient,
  isSupabaseConfigured,
  type Profile,
  type UserRole,
} from 'services/supabase/client';
import { toAuthSessionState } from 'services/supabase/sessionUtils';
import {
  requestSignupOtp,
  resendSignupOtp,
  upsertUserProfile,
  verifySignupOtp,
  setSignupPassword,
  buildFallbackProfile,
  type SignupDetails,
} from 'services/supabase/authService';

/** Prevents onAuthStateChange from clearing auth mid-signup verify */
let completingSignupVerification = false;

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: AuthSessionState | null;
  loading: boolean;
  isGuest: boolean;
  initialized: boolean;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  requestSignupVerification: (details: SignupDetails) => Promise<{ needsOtpVerification: boolean; userId: string | null }>;
  verifySignupAndCreateProfile: (details: SignupDetails, otp: string) => Promise<void>;
  resendSignupVerification: (email: string) => Promise<void>;
  saveSignupProfile: (details: SignupDetails, userId: string) => Promise<Profile>;
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

const applyAuthSession = async (session: Session | null) => {
  if (!session?.user) {
    if (completingSignupVerification) return;
    useAuthStore.setState({ user: null, profile: null, session: null, loading: false });
    return;
  }

  const profile = await loadProfile(session.user.id);
  useAuthStore.setState({
    user: session.user,
    profile,
    session: toAuthSessionState(session),
    loading: false,
    isGuest: false,
  });
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: true,
  isGuest: false,
  initialized: false,

  signIn: async (email, password) => {
    if (!isSupabaseConfigured) throw new Error('Authentication is not configured on this deployment.');
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.session) {
      await applyAuthSession(data.session);
    }
  },

  signUp: async (email, password, fullName, role) => {
    if (!isSupabaseConfigured) throw new Error('Authentication is not configured on this deployment.');
    const { data: { user }, error } = await getSupabaseClient().auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
    if (error) throw error;
    if (user) console.log('User created:', user.id);
  },

  requestSignupVerification: async (details) => {
    if (!isSupabaseConfigured) {
      throw new Error('Authentication is not configured on this deployment.');
    }
    return requestSignupOtp(details);
  },

  verifySignupAndCreateProfile: async (details, otp) => {
    if (!isSupabaseConfigured) {
      throw new Error('Authentication is not configured on this deployment.');
    }

    completingSignupVerification = true;
    try {
      const { session, user } = await verifySignupOtp(details.email, otp);
      const authUser = user ?? session?.user;
      const userId = authUser?.id;

      if (!userId) {
        throw new Error('Verification succeeded but no user was returned.');
      }

      const nextState: Pick<AuthState, 'user' | 'isGuest' | 'loading'> & {
        session?: AuthSessionState;
      } = {
        user: authUser,
        isGuest: false,
        loading: false,
      };

      if (session) {
        nextState.session = toAuthSessionState(session);
      }

      set(nextState);

      try {
        const profile = await upsertUserProfile({
          id: userId,
          email: details.email,
          role: details.role,
          firstName: details.firstName,
          lastName: details.lastName,
          childName: details.childName,
          emailVerified: true,
        });
        set({ profile });
      } catch (profileError) {
        console.error('Profile save failed (using local fallback):', profileError);
        set({ profile: buildFallbackProfile(details, userId) });
      }

      // Password must not block routing — set after auth state is saved
      void setSignupPassword(details.password);
    } finally {
      completingSignupVerification = false;
    }
  },

  resendSignupVerification: async (email) => {
    if (!isSupabaseConfigured) {
      throw new Error('Authentication is not configured on this deployment.');
    }
    await resendSignupOtp(email);
  },

  saveSignupProfile: async (details, userId) => {
    if (!isSupabaseConfigured) {
      throw new Error('Authentication is not configured on this deployment.');
    }

    const profile = await upsertUserProfile({
      id: userId,
      email: details.email,
      role: details.role,
      firstName: details.firstName,
      lastName: details.lastName,
      childName: details.childName,
      emailVerified: true,
    });

    const { data: { session } } = await getSupabaseClient().auth.getSession();
    set({
      user: session?.user ?? null,
      profile,
      session: session ? toAuthSessionState(session) : null,
      isGuest: false,
      loading: false,
    });

    return profile;
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
      set({ user: null, profile: null, session: null, isGuest: false });
      return;
    }
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw error;
    set({ user: null, profile: null, session: null, isGuest: false });
  },

  setGuestMode: () => {
    set({ isGuest: true, user: null, profile: null, session: null, loading: false });
  },

  initialize: () => {
    if (!isSupabaseConfigured) {
      set({ initialized: true, loading: false, user: null, profile: null, session: null });
      return () => {
        set({ initialized: false });
      };
    }

    set({ initialized: true, loading: true });

    getSupabaseClient().auth.getSession().then(({ data: { session } }) => {
      applyAuthSession(session);
    });

    const { data: { subscription } } = getSupabaseClient().auth.onAuthStateChange(
      async (_event, session) => {
        await applyAuthSession(session);
      },
    );

    return () => {
      subscription.unsubscribe();
      set({ initialized: false });
    };
  },
}));
