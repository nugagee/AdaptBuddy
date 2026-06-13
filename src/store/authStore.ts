import { create } from 'zustand';
import type {
  AuthChangeEvent,
  Session,
  Subscription,
  User,
} from '@supabase/supabase-js';
import type { AuthSessionState } from 'types/auth';
import {
  getProfile,
  getSupabaseClient,
  isSupabaseConfigured,
  type Profile,
  type UserRole,
} from 'services/supabase/client';
import { useChildSessionStore } from 'features/child/store/childSessionStore';
import {
  requestSignupOtp,
  resendSignupOtp,
  upsertUserProfile,
  verifySignupOtp,
  setSignupPassword,
  buildFallbackProfile,
  buildFallbackProfileFromUser,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resendPasswordResetOtp,
  updatePasswordAfterReset,
  type SignupDetails,
} from 'services/supabase/authService';
import { toAuthSessionState } from 'services/supabase/sessionUtils';

const GUEST_MODE_KEY = 'adaptbuddy-guest-mode';
const GUEST_PROFILE_KEY = 'adaptbuddy-guest-profile';

/** Prevents onAuthStateChange from clearing auth mid-signup verify / sign-in */
let completingAuthFlow = false;
let authSubscription: Subscription | null = null;
let initialSessionRequest: Promise<Session | null> | null = null;
let authInitializeVersion = 0;

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: AuthSessionState | null;
  loading: boolean;
  isGuest: boolean;
  initialized: boolean;

  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  requestSignupVerification: (details: SignupDetails) => Promise<{ needsOtpVerification: boolean; userId: string | null }>;
  verifySignupAndCreateProfile: (details: SignupDetails, otp: string) => Promise<void>;
  resendSignupVerification: (email: string) => Promise<void>;
  saveSignupProfile: (details: SignupDetails, userId: string) => Promise<Profile>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  verifyPasswordReset: (email: string, otp: string) => Promise<void>;
  resendPasswordReset: (email: string) => Promise<void>;
  completePasswordReset: (newPassword: string) => Promise<User>;
  /** @deprecated Use requestPasswordReset — kept for legacy modal */
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  setGuestMode: () => void;
  setProfile: (profile: Profile) => void;
  refreshProfile: () => Promise<Profile | null>;
  initialize: () => () => void;
}

const loadProfile = async (userId: string): Promise<Profile | null> => {
  try {
    return await getProfile(userId);
  } catch (error) {
    console.error('Failed to load profile:', error);
    return null;
  }
};

const getInitialSession = () => {
  if (!initialSessionRequest) {
    initialSessionRequest = getSupabaseClient()
      .auth
      .getSession()
      .then(({ data: { session } }) => session)
      .catch((error) => {
        console.warn('Failed to read initial Supabase session:', error);
        return null;
      })
      .finally(() => {
        initialSessionRequest = null;
      });
  }

  return initialSessionRequest;
};

const loadGuestProfile = (): Profile | null => {
  try {
    const raw = localStorage.getItem(GUEST_PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    localStorage.removeItem(GUEST_PROFILE_KEY);
    return null;
  }
};

const saveGuestProfile = (profile: Profile) => {
  localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(profile));
};

const applyAuthSession = async (session: Session) => {
  const profile =
    (await loadProfile(session.user.id)) ?? buildFallbackProfileFromUser(session.user);

  localStorage.removeItem(GUEST_MODE_KEY);
  localStorage.removeItem(GUEST_PROFILE_KEY);

  useAuthStore.setState({
    user: session.user,
    profile,
    session: toAuthSessionState(session),
    loading: false,
    isGuest: false,
  });
};

const applySignedOutState = () => {
  useChildSessionStore.getState().resetSession();
  localStorage.removeItem(GUEST_MODE_KEY);
  localStorage.removeItem(GUEST_PROFILE_KEY);
  useAuthStore.setState({
    user: null,
    profile: null,
    session: null,
    loading: false,
    isGuest: false,
  });
};

const applyNoSessionState = () => {
  const isGuest = localStorage.getItem(GUEST_MODE_KEY) === 'true';

  useAuthStore.setState({
    user: null,
    profile: isGuest ? loadGuestProfile() : null,
    session: null,
    loading: false,
    isGuest,
  });
};

const handleAuthStateChange = async (event: AuthChangeEvent, session: Session | null) => {
  if (event === 'SIGNED_OUT') {
    applySignedOutState();
    return;
  }

  if (completingAuthFlow) return;

  if (session?.user) {
    await applyAuthSession(session);
    return;
  }

  if (event === 'INITIAL_SESSION') {
    applyNoSessionState();
  }
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

    completingAuthFlow = true;
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const session = data.session;
      const user = data.user ?? session?.user;

      if (!user) {
        throw new Error('Sign in succeeded but no user was returned.');
      }

      const profile =
        (await loadProfile(user.id)) ?? buildFallbackProfileFromUser(user);

      localStorage.removeItem(GUEST_MODE_KEY);
      localStorage.removeItem(GUEST_PROFILE_KEY);

      set({
        user,
        profile,
        session: session ? toAuthSessionState(session) : null,
        isGuest: false,
        loading: false,
      });

      return user;
    } finally {
      window.setTimeout(() => {
        completingAuthFlow = false;
      }, 300);
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

    completingAuthFlow = true;
    try {
      const { session, user } = await verifySignupOtp(details.email, otp);
      const authUser = user ?? session?.user;
      const userId = authUser?.id;

      if (!userId) {
        throw new Error('Verification succeeded but no user was returned.');
      }

      localStorage.removeItem(GUEST_MODE_KEY);
      localStorage.removeItem(GUEST_PROFILE_KEY);

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

      // Password must not block routing - set after auth state is saved.
      void setSignupPassword(details.password);
    } finally {
      window.setTimeout(() => {
        completingAuthFlow = false;
      }, 300);
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
    localStorage.removeItem(GUEST_MODE_KEY);
    localStorage.removeItem(GUEST_PROFILE_KEY);
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

  requestPasswordReset: async (email) => {
    if (!isSupabaseConfigured) {
      throw new Error('Authentication is not configured on this deployment.');
    }
    await requestPasswordResetOtp(email);
  },

  verifyPasswordReset: async (email, otp) => {
    if (!isSupabaseConfigured) {
      throw new Error('Authentication is not configured on this deployment.');
    }

    completingAuthFlow = true;
    try {
      const { session, user } = await verifyPasswordResetOtp(email, otp);
      const authUser = user ?? session?.user;

      if (!authUser) {
        throw new Error('Verification succeeded but no user was returned.');
      }

      localStorage.removeItem(GUEST_MODE_KEY);
      localStorage.removeItem(GUEST_PROFILE_KEY);

      set({
        user: authUser,
        session: session ? toAuthSessionState(session) : null,
        isGuest: false,
        loading: false,
      });
    } finally {
      window.setTimeout(() => {
        completingAuthFlow = false;
      }, 300);
    }
  },

  resendPasswordReset: async (email) => {
    if (!isSupabaseConfigured) {
      throw new Error('Authentication is not configured on this deployment.');
    }
    await resendPasswordResetOtp(email);
  },

  completePasswordReset: async (newPassword) => {
    if (!isSupabaseConfigured) {
      throw new Error('Authentication is not configured on this deployment.');
    }

    completingAuthFlow = true;
    try {
      await updatePasswordAfterReset(newPassword);

      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const user = session?.user;

      if (!user) {
        throw new Error('Password updated but no session was found. Please sign in.');
      }

      const profile =
        (await loadProfile(user.id)) ?? buildFallbackProfileFromUser(user);

      localStorage.removeItem(GUEST_MODE_KEY);
      localStorage.removeItem(GUEST_PROFILE_KEY);

      set({
        user,
        profile,
        session: session ? toAuthSessionState(session) : null,
        isGuest: false,
        loading: false,
      });

      return user;
    } finally {
      window.setTimeout(() => {
        completingAuthFlow = false;
      }, 300);
    }
  },

  resetPassword: async (email) => {
    await get().requestPasswordReset(email);
  },

  signOut: async () => {
    useChildSessionStore.getState().resetSession();

    if (!isSupabaseConfigured) {
      applySignedOutState();
      return;
    }
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw error;
    applySignedOutState();
  },

  setGuestMode: () => {
    localStorage.setItem(GUEST_MODE_KEY, 'true');
    set({ isGuest: true, user: null, profile: loadGuestProfile(), session: null, loading: false });
  },

  setProfile: (profile) => {
    if (get().isGuest) saveGuestProfile(profile);
    set({ profile });
  },

  refreshProfile: async () => {
    const userId = get().user?.id;
    if (!userId || !isSupabaseConfigured) return null;

    try {
      const profile = await getProfile(userId);
      set({ profile });
      return profile;
    } catch {
      return get().profile;
    }
  },

  initialize: () => {
    const version = authInitializeVersion + 1;
    authInitializeVersion = version;

    if (!isSupabaseConfigured) {
      set({
        initialized: true,
        loading: false,
        user: null,
        profile: localStorage.getItem(GUEST_MODE_KEY) === 'true' ? loadGuestProfile() : null,
        session: null,
        isGuest: localStorage.getItem(GUEST_MODE_KEY) === 'true',
      });
      return () => {
        if (authInitializeVersion === version) set({ initialized: false });
      };
    }

    set({ initialized: true, loading: true });

    getInitialSession().then((session) => {
      if (authInitializeVersion !== version) return;

      if (session?.user) {
        void applyAuthSession(session);
      } else {
        applyNoSessionState();
      }
    });

    if (!authSubscription) {
      const { data: { subscription } } = getSupabaseClient().auth.onAuthStateChange(
        (event, session) => {
          void handleAuthStateChange(event, session);
        },
      );

      authSubscription = subscription;
    }

    return () => {
      if (authInitializeVersion !== version) return;
      authSubscription?.unsubscribe();
      authSubscription = null;
      set({ initialized: false });
    };
  },
}));
