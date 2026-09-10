import { useAuthStore } from 'store/authStore';
import {
  type ChildProgressHydrationStatus,
  useChildProgressStore,
} from 'features/child/store/childProgressStore';

export interface ChildProgressReadAccess {
  childId: string | null;
  isReady: boolean;
}

interface AuthenticatedChildInput {
  userId: string | null;
  profileId: string | null;
  profileRole: string | null;
  isGuest: boolean;
}

export const resolveAuthenticatedChildId = ({
  userId,
  profileId,
  profileRole,
  isGuest,
}: AuthenticatedChildInput): string | null => (
  !isGuest
  && profileRole === 'child'
  && userId
  && profileId === userId
    ? userId
    : null
);

/**
 * Returns the active child scope. Registered children use their verified auth
 * id; the single demo guest uses a fixed, transient scope that is never bound
 * to persisted child storage.
 */
export const resolveChildScopeId = (input: AuthenticatedChildInput): string | null => {
  const authenticatedChildId = resolveAuthenticatedChildId(input);
  if (authenticatedChildId) return authenticatedChildId;

  return input.isGuest
    && !input.userId
    && input.profileRole === 'child'
    && input.profileId === 'guest-child'
      ? 'guest-child'
      : null;
};

export const isChildProgressReadable = (
  childId: string | null,
  ownerId: string | null,
  hydrationStatus: ChildProgressHydrationStatus,
): boolean => Boolean(
  childId
  && ownerId === childId
  && hydrationStatus === 'ready',
);

/**
 * Re-check auth at mutation time before returning the writable progress store.
 * Components with delayed work (timers, speech, network requests) must not rely
 * only on the owner that was valid when they first rendered.
 */
export const getReadyChildProgressForOwner = (expectedOwnerId: string | null) => {
  const auth = useAuthStore.getState();
  const childId = resolveChildScopeId({
    userId: auth.user?.id ?? null,
    profileId: auth.profile?.id ?? null,
    profileRole: auth.profile?.role ?? null,
    isGuest: auth.isGuest,
  });
  if (!expectedOwnerId || childId !== expectedOwnerId) return null;

  const progress = useChildProgressStore.getState();
  return isChildProgressReadable(
    childId,
    progress.ownerId,
    progress.hydrationStatus,
  )
    ? progress
    : null;
};

/**
 * Child progress is readable only when auth and the hydrated store agree on
 * the same authenticated child. This keeps a previous child's in-memory state
 * out of the UI while sign-out, account switching, or hydration is in flight.
 */
export const useChildProgressReadAccess = (): ChildProgressReadAccess => {
  const childId = useAuthStore((state) => resolveChildScopeId({
    userId: state.user?.id ?? null,
    profileId: state.profile?.id ?? null,
    profileRole: state.profile?.role ?? null,
    isGuest: state.isGuest,
  }));
  const isReady = useChildProgressStore((state) => isChildProgressReadable(
    childId,
    state.ownerId,
    state.hydrationStatus,
  ));

  return {
    childId,
    isReady,
  };
};
