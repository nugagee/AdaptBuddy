import { useEffect } from 'react';
import { useAuthStore } from 'store/authStore';
import { useUiStore } from 'store/uiStore';
import {
  beginAutismProfileScope,
  hydrateAutismProfileScope,
  unbindAutismProfileScope,
  updateAutismProfileForChild,
  shouldApplyRemoteAutismProfile,
  useAutismProfileStore,
} from 'features/child/store/autismProfileStore';
import {
  beginChildProgressScope,
  hydrateChildProgressScope,
  unbindChildProgressScope,
  useChildProgressStore,
} from 'features/child/store/childProgressStore';
import { resolveChildScopeId } from 'features/child/store/childProgressReadAccess';
import { fetchAutismProfile } from 'services/supabase/autismProfileService';

const getCurrentChildScopeId = (): string | null => {
  const { user, profile, isGuest } = useAuthStore.getState();
  return resolveChildScopeId({
    userId: user?.id ?? null,
    profileId: profile?.id ?? null,
    profileRole: profile?.role ?? null,
    isGuest,
  });
};

const unbindChildStores = () => {
  unbindAutismProfileScope();
  unbindChildProgressScope();
};

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
    let activeChildId: string | null = null;
    let scopeEpoch = 0;
    let disposed = false;

    const isCurrentScope = (childId: string, epoch: number) =>
      !disposed &&
      scopeEpoch === epoch &&
      activeChildId === childId &&
      getCurrentChildScopeId() === childId;

    const bindCurrentChild = () => {
      const childId = getCurrentChildScopeId();
      if (childId === activeChildId) return;

      const epoch = ++scopeEpoch;
      activeChildId = childId;

      // Reset synchronously before starting another hydration so no state from
      // the previous account can render or be written under the next account.
      unbindChildStores();
      if (!childId) return;

      const isGuestScope = useAuthStore.getState().isGuest;
      if (isGuestScope) {
        // Guest mode is an in-memory demo. It gets a usable isolated scope,
        // but the persistence adapters remain unbound so no guest activity is
        // saved alongside a registered child's records.
        const autism = useAutismProfileStore.getState();
        autism.resetForChild(childId);
        autism.markReady(childId);
        const progress = useChildProgressStore.getState();
        progress.resetForChild(childId);
        progress.markReady(childId);
        return;
      }

      const autismToken = beginAutismProfileScope(childId);
      const progressToken = beginChildProgressScope(childId);

      // Progress and the support passport hydrate independently. One corrupt
      // local record must not block the other feature from becoming usable.
      void hydrateChildProgressScope(progressToken).catch(() => undefined);

      void (async () => {
        try {
          const autismResult = await hydrateAutismProfileScope(autismToken);

          if (
            autismResult !== 'ready'
            || !isCurrentScope(childId, epoch)
          ) {
            return;
          }

          // Keep the exact hydrated profile reference. If the child saves or
          // onboarding updates their profile while this request is pending,
          // the fetched copy is stale and must not replace the newer edit.
          const profileBeforeFetch = useAutismProfileStore.getState().profile;
          const remote = await fetchAutismProfile(childId);
          if (!isCurrentScope(childId, epoch)) return;

          const autismStore = useAutismProfileStore.getState();
          if (
            autismStore.ownerId !== childId ||
            autismStore.hydrationStatus !== 'ready'
          ) {
            return;
          }

          if (remote && shouldApplyRemoteAutismProfile(profileBeforeFetch, remote)) {
            updateAutismProfileForChild(childId, remote, profileBeforeFetch);
          } else if (autismStore.profile.childId !== childId) {
            updateAutismProfileForChild(childId, autismStore.profile);
          }
        } catch {
          // Local persisted state remains available when the remote profile is
          // offline. Hydration failures remain fail-closed in the error state.
        }
      })();
    };

    // Clear any scope left behind by a previous initializer instance (for
    // example during StrictMode remounting), then bind the current auth state.
    unbindChildStores();
    bindCurrentChild();

    const unsubscribeAuth = useAuthStore.subscribe(bindCurrentChild);

    return () => {
      disposed = true;
      ++scopeEpoch;
      activeChildId = null;
      unsubscribeAuth();
      unbindChildStores();
    };
  }, []);

  return null;
};

export default StoreInitializer;
