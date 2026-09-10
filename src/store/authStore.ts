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
import { useTrustedAdultStore } from 'features/child/store/trustedAdultStore';
import {
  requestSignupOtp,
  resendSignupOtp,
  upsertUserProfile,
  verifySignupOtp,
  setSignupPassword,
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
let completingAuthFlow: number | null = null;
let authTransitionVersion = 0;
let localSignOutVersion: number | null = null;

const assertCurrentTransition = (version: number) => {
  if (version !== authTransitionVersion) {
    throw new Error('This sign-in was cancelled by a newer account change.');
  }
};

const finishAuthFlow = (version: number) => {
  if (completingAuthFlow === version) completingAuthFlow = null;
  if (version === authTransitionVersion) useAuthStore.setState({ loading: false });
};

// SIGNED_OUT from our own awaited signOut is already represented by the cleared UI.
const clearAuthSession = async (version: number, localOnly = true) => {
  assertCurrentTransition(version);
  localSignOutVersion = version;
  try {
    const { error } = await getSupabaseClient().auth.signOut(localOnly ? { scope: 'local' } : undefined);
    if (error) throw error;
  } finally {
    if (localSignOutVersion === version) localSignOutVersion = null;
  }
  assertCurrentTransition(version);
};
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
  setGuestMode: (role?: UserRole) => Promise<boolean>;
  restoreGuestMode: () => Promise<boolean>;
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

type GuestRole = Exclude<UserRole, 'admin'>;

const createGuestProfile = (role: UserRole = 'child'): Profile => {
  const guestRole: GuestRole =
    role === 'parent' || role === 'teacher' ? role : 'child';
  const now = new Date().toISOString();
  const names: Record<GuestRole, { first: string; last: string; full: string; email: string }> = {
    child: {
      first: 'Alex',
      last: 'Guest',
      full: 'Alex Guest',
      email: 'guest-child@adaptbuddy.local',
    },
    parent: {
      first: 'Parent',
      last: 'Guest',
      full: 'Parent Guest',
      email: 'guest-parent@adaptbuddy.local',
    },
    teacher: {
      first: 'Teacher',
      last: 'Guest',
      full: 'Teacher Guest',
      email: 'guest-teacher@adaptbuddy.local',
    },
  };
  const name = names[guestRole];

  return {
    id: `guest-${guestRole}`,
    email: name.email,
    role: guestRole,
    first_name: name.first,
    last_name: name.last,
    full_name: name.full,
    child_name: guestRole === 'parent' ? 'Alex' : null,
    buddy_id: guestRole === 'child' ? 'AB-GEST-01' : null,
    avatar_url: null,
    bio: null,
    age: guestRole === 'child' ? 10 : null,
    sex: null,
    gender: null,
    neuro_types: [],
    onboarding_completed: false,
    companion_onboarding_completed: false,
    email_verified_at: now,
    created_at: now,
    updated_at: now,
  };
};

const loadGuestProfile = (role?: UserRole): Profile | null => {
  try {
    const raw = localStorage.getItem(GUEST_PROFILE_KEY);
    const profile = raw ? (JSON.parse(raw) as Profile) : null;
    if (profile?.role === 'admin') {
      localStorage.removeItem(GUEST_PROFILE_KEY);
      localStorage.removeItem(GUEST_MODE_KEY);
      return null;
    }
    if (role && profile?.role !== role) return null;
    return profile;
  } catch {
    localStorage.removeItem(GUEST_PROFILE_KEY);
    return null;
  }
};

const saveGuestProfile = (profile: Profile) => {
  localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(profile));
};

export const hasStoredGuestMode = () =>
  typeof window !== 'undefined' && localStorage.getItem(GUEST_MODE_KEY) === 'true';

const prepareAuthenticatedTransition = () => {
  const version = ++authTransitionVersion;
  useChildSessionStore.getState().resetSession();
  useTrustedAdultStore.getState().clearTrustedAdults();
  localStorage.removeItem(GUEST_MODE_KEY);
  localStorage.removeItem(GUEST_PROFILE_KEY);
  useAuthStore.setState({
    user: null,
    profile: null,
    session: null,
    loading: true,
    isGuest: false,
  });
  return version;
};

const applySignedOutState = () => {
  ++authTransitionVersion;
  completingAuthFlow = null;
  useChildSessionStore.getState().resetSession();
  useTrustedAdultStore.getState().clearTrustedAdults();
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

const rejectUnverifiedProfile = async (version: number): Promise<never> => {
  assertCurrentTransition(version);
  applySignedOutState();
  const signedOutVersion = authTransitionVersion;
  try {
    await clearAuthSession(signedOutVersion);
  } catch (error) {
    console.error('Could not clear an unverified local session:', error);
  }
  throw new Error('Your account profile could not be verified. Please sign in again.');
};

const loadRequiredProfile = async (userId: string, version: number): Promise<Profile> => {
  const profile = await loadProfile(userId);
  assertCurrentTransition(version);
  if (!profile || profile.id !== userId) return rejectUnverifiedProfile(version);
  return profile;
};

const applyAuthSession = async (session: Session) => {
  const current = useAuthStore.getState();
  const canRefreshInPlace = (
    !current.isGuest
    && current.user?.id === session.user.id
    && current.profile?.id === session.user.id
  );

  // Supabase emits TOKEN_REFRESHED, USER_UPDATED, and sometimes repeated
  // SIGNED_IN events for the account that is already active. Keep the verified
  // account mounted while its profile is rechecked so child-scoped stores,
  // drafts, and timers are not torn down as though another child signed in.
  if (canRefreshInPlace) {
    const version = ++authTransitionVersion;
    const profile = await loadRequiredProfile(session.user.id, version);
    assertCurrentTransition(version);
    useAuthStore.setState({
      user: session.user,
      profile,
      session: toAuthSessionState(session),
      loading: false,
      isGuest: false,
    });
    return;
  }

  const version = prepareAuthenticatedTransition();
  const profile = await loadRequiredProfile(session.user.id, version);
  assertCurrentTransition(version);
  useAuthStore.setState({
    user: session.user,
    profile,
    session: toAuthSessionState(session),
    loading: false,
    isGuest: false,
  });
};

const applyNoSessionState = () => {
  ++authTransitionVersion;
  useChildSessionStore.getState().resetSession();
  useTrustedAdultStore.getState().clearTrustedAdults();
  const isGuest = hasStoredGuestMode();
  const guestProfile = isGuest ? loadGuestProfile() ?? createGuestProfile('child') : null;
  if (guestProfile) saveGuestProfile(guestProfile);

  useAuthStore.setState({
    user: null,
    profile: guestProfile,
    session: null,
    loading: false,
    isGuest,
    initialized: true,
  });
};

const handleAuthStateChange = async (event: AuthChangeEvent, session: Session | null) => {
  if (event === 'SIGNED_OUT') {
    if (localSignOutVersion === authTransitionVersion) return;
    if (hasStoredGuestMode()) {
      applyNoSessionState();
    } else {
      applySignedOutState();
    }
    return;
  }

  if (completingAuthFlow !== null) return;

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

    const version = prepareAuthenticatedTransition();
    completingAuthFlow = version;
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const session = data.session;
      const user = data.user ?? session?.user;

      if (!user) {
        throw new Error('Sign in succeeded but no user was returned.');
      }

      assertCurrentTransition(version);
      const profile = await loadRequiredProfile(user.id, version);
      assertCurrentTransition(version);

      set({
        user,
        profile,
        session: session ? toAuthSessionState(session) : null,
        isGuest: false,
        loading: false,
      });

      return user;
    } finally {
      finishAuthFlow(version);
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

    const version = prepareAuthenticatedTransition();
    completingAuthFlow = version;
    try {
      const { session, user } = await verifySignupOtp(details.email, otp);
      const authUser = user ?? session?.user;
      const userId = authUser?.id;

      if (!userId) {
        throw new Error('Verification succeeded but no user was returned.');
      }

      assertCurrentTransition(version);

      try {
        const profile = await upsertUserProfile({
          id: userId,
          email: details.email,
          role: details.role,
          firstName: details.firstName,
          lastName: details.lastName,
          childName: details.childName,
          sex: details.sex,
          gender: details.gender,
          age: details.age,
          emailVerified: true,
        });
        assertCurrentTransition(version);
        set({
          user: authUser,
          profile,
          session: session ? toAuthSessionState(session) : null,
          isGuest: false,
          loading: false,
        });
      } catch (profileError) {
        console.error('Profile save failed; closing the unverified session:', profileError);
        await rejectUnverifiedProfile(version);
      }

      // Complete the credential update within this account transition.
      assertCurrentTransition(version);
      await setSignupPassword(details.password);
    } finally {
      finishAuthFlow(version);
    }
  },

  resendSignupVerification: async (email) => {
    if (!isSupabaseConfigured) {
      throw new Error('Authentication is not configured on this deployment.');
    }
    await resendSignupOtp(email);
  },

  saveSignupProfile: async (details, userId) => {
    if (!isSupabaseConfigured) throw new Error('Authentication is not configured on this deployment.');
    const version = prepareAuthenticatedTransition();
    completingAuthFlow = version;
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      assertCurrentTransition(version);
      if (!session?.user || session.user.id !== userId) return rejectUnverifiedProfile(version);
      const profile = await upsertUserProfile({
        id: userId, email: details.email, role: details.role,
        firstName: details.firstName, lastName: details.lastName, childName: details.childName,
        sex: details.sex, gender: details.gender, age: details.age,
      }).catch(() => rejectUnverifiedProfile(version));
      assertCurrentTransition(version);
      set({ user: session.user, profile, session: toAuthSessionState(session), isGuest: false, loading: false });
      return profile;
    } finally {
      finishAuthFlow(version);
    }
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

    const version = prepareAuthenticatedTransition();
    completingAuthFlow = version;
    try {
      const { session, user } = await verifyPasswordResetOtp(email, otp);
      const authUser = user ?? session?.user;

      if (!authUser) {
        throw new Error('Verification succeeded but no user was returned.');
      }

      assertCurrentTransition(version);
      const profile = await loadRequiredProfile(authUser.id, version);
      assertCurrentTransition(version);

      set({
        user: authUser,
        profile,
        session: session ? toAuthSessionState(session) : null,
        isGuest: false,
        loading: false,
      });
    } finally {
      finishAuthFlow(version);
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

    const version = prepareAuthenticatedTransition();
    completingAuthFlow = version;
    try {
      await updatePasswordAfterReset(newPassword);

      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const user = session?.user;

      if (!user) {
        throw new Error('Password updated but no session was found. Please sign in.');
      }

      assertCurrentTransition(version);
      const profile = await loadRequiredProfile(user.id, version);
      assertCurrentTransition(version);

      set({
        user,
        profile,
        session: session ? toAuthSessionState(session) : null,
        isGuest: false,
        loading: false,
      });

      return user;
    } finally {
      finishAuthFlow(version);
    }
  },

  resetPassword: async (email) => {
    await get().requestPasswordReset(email);
  },

  signOut: async () => {
    applySignedOutState();
    const version = authTransitionVersion;
    completingAuthFlow = version;
    try {
      if (isSupabaseConfigured) await clearAuthSession(version, false);
    } finally {
      finishAuthFlow(version);
    }
  },

  setGuestMode: async (role = 'child') => {
    const version = prepareAuthenticatedTransition();
    completingAuthFlow = version;
    try {
      if (isSupabaseConfigured) await clearAuthSession(version);
      assertCurrentTransition(version);
      const guestProfile = createGuestProfile(role);
      localStorage.setItem(GUEST_MODE_KEY, 'true');
      saveGuestProfile(guestProfile);
      set({ isGuest: true, user: null, profile: guestProfile, session: null, loading: false, initialized: true });
      return true;
    } catch (error) {
      console.error('Could not isolate guest mode from the signed-in session:', error);
      return false;
    } finally {
      finishAuthFlow(version);
    }
  },

  restoreGuestMode: async () => {
    if (!hasStoredGuestMode()) return false;
    const guestProfile = loadGuestProfile() ?? createGuestProfile('child');
    const restored = await get().setGuestMode(guestProfile.role);
    if (restored && get().isGuest && get().profile?.id === guestProfile.id) {
      saveGuestProfile(guestProfile);
      set({ profile: guestProfile });
      return true;
    }
    return false;
  },

  setProfile: (profile) => {
    if (profile.id !== get().profile?.id) return;
    if (get().isGuest) saveGuestProfile(profile);
    set({ profile });
  },

  refreshProfile: async () => {
    const version = authTransitionVersion;
    const userId = get().user?.id;
    if (!userId || !isSupabaseConfigured) return null;

    try {
      const profile = await getProfile(userId);
      if (version !== authTransitionVersion || get().user?.id !== userId) return null;
      if (!profile || profile.id !== userId) return rejectUnverifiedProfile(version);
      set({ profile });
      return profile;
    } catch {
      if (version !== authTransitionVersion || get().user?.id !== userId) return null;
      const currentProfile = get().profile;
      return currentProfile?.id === userId ? currentProfile : null;
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
        profile:
          hasStoredGuestMode()
            ? loadGuestProfile() ?? createGuestProfile('child')
            : null,
        session: null,
        isGuest: hasStoredGuestMode(),
      });
      return () => {
        if (authInitializeVersion === version) set({ initialized: false });
      };
    }

    set({ initialized: true, loading: true });

    const transitionAtInitialization = authTransitionVersion;
    getInitialSession().then(async (session) => {
      if (authInitializeVersion !== version || authTransitionVersion !== transitionAtInitialization) return;

      if (session?.user && hasStoredGuestMode()) {
        await get().restoreGuestMode();
      } else if (session?.user) {
        void applyAuthSession(session).catch((error) => {
          console.error('Could not apply the authenticated session safely:', error);
        });
      } else {
        applyNoSessionState();
      }
    });

    if (!authSubscription) {
      const { data: { subscription } } = getSupabaseClient().auth.onAuthStateChange(
        (event, session) => {
          void handleAuthStateChange(event, session).catch((error) => {
            console.error('Could not process the authentication change safely:', error);
          });
        },
      );

      authSubscription = subscription;
    }

    return () => {
      if (authInitializeVersion !== version) return;
      ++authInitializeVersion;
      ++authTransitionVersion;
      completingAuthFlow = null;
      authSubscription?.unsubscribe();
      authSubscription = null;
      set({ initialized: false });
    };
  },
}));
