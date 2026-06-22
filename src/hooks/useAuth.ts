import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from 'store/authStore';

/** Auth state + actions (Zustand, backed by Supabase) */
export const useAuth = () =>
  useAuthStore(
    useShallow((s) => ({
      user: s.user,
      profile: s.profile,
      session: s.session,
      loading: s.loading,
      initialized: s.initialized,
      isGuest: s.isGuest,
      signIn: s.signIn,
      signUp: s.signUp,
      requestSignupVerification: s.requestSignupVerification,
      verifySignupAndCreateProfile: s.verifySignupAndCreateProfile,
      resendSignupVerification: s.resendSignupVerification,
      saveSignupProfile: s.saveSignupProfile,
      signInWithGoogle: s.signInWithGoogle,
      signInWithApple: s.signInWithApple,
      requestPasswordReset: s.requestPasswordReset,
      verifyPasswordReset: s.verifyPasswordReset,
      resendPasswordReset: s.resendPasswordReset,
      completePasswordReset: s.completePasswordReset,
      resetPassword: s.resetPassword,
      signOut: s.signOut,
      setGuestMode: s.setGuestMode,
      setProfile: s.setProfile,
      refreshProfile: s.refreshProfile,
    }))
  );
