import { useEffect } from 'react';
import { useAuthStore } from 'store/authStore';
import { useUiStore } from 'store/uiStore';
import { useAutismProfileStore } from 'features/child/store/autismProfileStore';
import { fetchAutismProfile } from 'services/supabase/autismProfileService';

/**
 * Boots Zustand stores that need side effects (Supabase session, DOM theme sync).
 * Mount once at the app root — no context providers required.
 */
const StoreInitializer = () => {
  const initializeAuth = useAuthStore((s) => s.initialize);
  const syncThemeToDom = useUiStore((s) => s.syncThemeToDom);
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    const unsubscribeAuth = initializeAuth();
    syncThemeToDom();
    return unsubscribeAuth;
  }, [initializeAuth, syncThemeToDom]);

  useEffect(() => {
    syncThemeToDom();
  }, [theme, syncThemeToDom]);

  useEffect(() => {
    const root = document.documentElement;
    const { reducedMotion, fontScale, dyslexiaFont, highContrast } = useUiStore.getState();

    root.dataset.reducedMotion = reducedMotion ? 'true' : 'false';
    root.style.fontSize = `${fontScale * 100}%`;
    root.dataset.dyslexiaFont = dyslexiaFont ? 'true' : 'false';
    root.dataset.highContrast = highContrast ? 'true' : 'false';

    return useUiStore.subscribe((state) => {
      root.dataset.reducedMotion = state.reducedMotion ? 'true' : 'false';
      root.style.fontSize = `${state.fontScale * 100}%`;
      root.dataset.dyslexiaFont = state.dyslexiaFont ? 'true' : 'false';
      root.dataset.highContrast = state.highContrast ? 'true' : 'false';
    });
  }, []);

  useEffect(() => {
    const syncAutismProfile = async (userId: string | undefined, role: string | undefined) => {
      if (!userId || role !== 'child') return;
      try {
        const remote = await fetchAutismProfile(userId);
        if (remote) {
          useAutismProfileStore.getState().updateProfile(remote);
        } else {
          useAutismProfileStore.getState().updateProfile({
            ...useAutismProfileStore.getState().profile,
            childId: userId,
          });
        }
      } catch {
        // Local persisted profile remains available offline
      }
    };

    void syncAutismProfile(
      useAuthStore.getState().user?.id,
      useAuthStore.getState().profile?.role,
    );

    return useAuthStore.subscribe((state) => {
      void syncAutismProfile(state.user?.id, state.profile?.role);
    });
  }, []);

  return null;
};

export default StoreInitializer;
