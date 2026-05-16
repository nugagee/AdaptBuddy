import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from 'store/authStore';

/** Auth state + actions (Zustand, backed by Supabase) */
export const useAuth = () =>
  useAuthStore(
    useShallow((s) => ({
      user: s.user,
      profile: s.profile,
      loading: s.loading,
      isGuest: s.isGuest,
      signIn: s.signIn,
      signUp: s.signUp,
      signInWithGoogle: s.signInWithGoogle,
      signInWithApple: s.signInWithApple,
      resetPassword: s.resetPassword,
      signOut: s.signOut,
      setGuestMode: s.setGuestMode,
    }))
  );
