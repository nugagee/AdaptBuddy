import { useEffect } from 'react';
import { useAuthStore } from 'store/authStore';
import { useUiStore } from 'store/uiStore';

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

  return null;
};

export default StoreInitializer;
