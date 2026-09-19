import { buildCompanionOnboardingUpdate } from './profileUpdatePayloads';

describe('companion onboarding profile update', () => {
  it('does not replace the child\'s selected neurodiversity profiles', () => {
    const update = buildCompanionOnboardingUpdate();

    expect(update).toEqual({
      onboarding_completed: true,
      companion_onboarding_completed: true,
    });
    expect(update).not.toHaveProperty('neuro_types');
  });
});
