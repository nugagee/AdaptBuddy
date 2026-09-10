export interface CompanionOnboardingUpdate {
  onboarding_completed: true;
  companion_onboarding_completed: true;
}

/**
 * Companion setup is independent of a child's selected support profiles.
 * Keeping this payload narrow prevents onboarding from silently replacing
 * Dyscalculia, Dyspraxia, or a multi-profile selection with Autism.
 */
export const buildCompanionOnboardingUpdate = (): CompanionOnboardingUpdate => ({
  onboarding_completed: true,
  companion_onboarding_completed: true,
});
