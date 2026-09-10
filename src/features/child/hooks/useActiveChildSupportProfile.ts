import { useAuth } from 'hooks/useAuth';
import { useAuthStore } from 'store/authStore';
import {
  selectAutismProfileForChild,
  useAutismProfileStore,
} from 'features/child/store/autismProfileStore';
import { resolveChildScopeId } from 'features/child/store/childProgressReadAccess';
import type { AutismProfile } from 'features/child/types/autismProfile';

export interface ActiveChildSupportProfile {
  childId: string | null;
  supportProfile: AutismProfile | null;
  preferredName: string;
  age: number | null;
  isGuest: boolean;
  isReady: boolean;
}

/**
 * Re-check the current auth and support-profile owners at result time. This is
 * intentionally independent of the rendered hook value so delayed AI results
 * cannot land in a different child's session after an account/scope change.
 */
export const getCurrentReadyChildSupportProfile = (
  expectedChildId: string | null,
): AutismProfile | null => {
  if (!expectedChildId) return null;

  const auth = useAuthStore.getState();
  const childId = resolveChildScopeId({
    userId: auth.user?.id ?? null,
    profileId: auth.profile?.id ?? null,
    profileRole: auth.profile?.role ?? null,
    isGuest: auth.isGuest,
  });

  if (childId !== expectedChildId) return null;

  return selectAutismProfileForChild(
    useAutismProfileStore.getState(),
    expectedChildId,
  );
};

/**
 * Resolve both registered-child and transient guest-child sessions through one
 * owner-checked Support Passport view.
 */
export const useActiveChildSupportProfile = (): ActiveChildSupportProfile => {
  const { profile, user, isGuest } = useAuth();
  const childId = resolveChildScopeId({
    userId: user?.id ?? null,
    profileId: profile?.id ?? null,
    profileRole: profile?.role ?? null,
    isGuest,
  });
  const supportProfile = useAutismProfileStore((state) =>
    selectAutismProfileForChild(state, childId),
  );
  const preferredName = supportProfile?.aboutMe?.preferredName?.trim()
    || profile?.first_name?.trim()
    || 'friend';

  return {
    childId,
    supportProfile,
    preferredName,
    age: profile?.age ?? null,
    isGuest,
    isReady: Boolean(childId && supportProfile),
  };
};
