import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

const mockNavigate = jest.fn();
const mockSetProfile = jest.fn();

const mockHookProfile = {
  id: 'guest-child',
  role: 'child',
  first_name: 'Love',
  age: 10,
  neuro_types: ['dysgraphia'],
  companion_onboarding_completed: false,
};

const mockCurrentAuth = {
  user: null,
  profile: { ...mockHookProfile },
  isGuest: true,
};

const mockAutismStore = {
  ownerId: 'guest-child',
  hydrationStatus: 'ready',
  profile: {
    childId: 'guest-child',
    updatedAt: 'before-onboarding',
  },
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('hooks/useAuth', () => ({
  useAuth: () => ({
    profile: mockHookProfile,
    setProfile: mockSetProfile,
  }),
}));

jest.mock('store/authStore', () => ({
  useAuthStore: Object.assign(
    () => mockCurrentAuth,
    {
      getState: () => mockCurrentAuth,
      subscribe: () => () => undefined,
    },
  ),
}));

jest.mock('features/child/store/autismProfileStore', () => ({
  useAutismProfileStore: {
    getState: () => mockAutismStore,
  },
  updateAutismProfileForChild: (
    childId: string,
    nextProfile: typeof mockAutismStore.profile,
  ) => {
    if (childId !== mockAutismStore.ownerId) return false;
    mockAutismStore.profile = nextProfile;
    return true;
  },
}));

jest.mock('features/child/constants/companionOnboarding', () => ({
  CALM_STRATEGY_OPTIONS: [],
  COMMUNICATION_DIFFICULTIES: [],
  EXECUTIVE_OPTIONS: [],
  GOAL_OPTIONS: [],
  LEARNING_ONBOARDING: [],
  ONBOARDING_STEPS: [{ id: 'about', title: 'About me', subtitle: 'Your choices' }],
  PARENT_COPILOT_MAX_AGE: 12,
  SENSORY_ONBOARDING: [],
  emptyOnboardingAnswers: (preferredName: string) => ({
    preferredName,
    favouriteThings: [],
    happyTriggers: [],
    learningFormats: [],
    communicationDifficulties: [],
    sensorySensitivities: [],
    worryTopics: '',
    frustrationTriggers: '',
    calmStrategies: [],
    helpBehaviour: '',
    executiveDifficulties: [],
    goals: [],
  }),
  buildAutismProfileFromOnboarding: (childId: string, answers: { preferredName: string }) => ({
    childId,
    updatedAt: 'after-onboarding',
    aboutMe: { preferredName: answers.preferredName },
  }),
}));

jest.mock('services/supabase/profileService', () => ({
  completeCompanionOnboarding: jest.fn(),
}));

jest.mock('services/supabase/autismProfileService', () => ({
  saveAutismProfile: jest.fn(),
}));

jest.mock('pages/auth/AuthBackground', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AuthLogo: () => null,
}));

const CompanionOnboardingPage = require('./CompanionOnboardingPage').default;

describe('CompanionOnboardingPage guest support selection', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockSetProfile.mockClear();
    mockCurrentAuth.profile = { ...mockHookProfile };
    mockAutismStore.ownerId = 'guest-child';
    mockAutismStore.hydrationStatus = 'ready';
    mockAutismStore.profile = {
      childId: 'guest-child',
      updatedAt: 'before-onboarding',
    };
  });

  it('does not inject Autism if the current guest selection becomes empty', () => {
    render(<CompanionOnboardingPage />);

    mockCurrentAuth.profile.neuro_types = [];
    fireEvent.click(screen.getByRole('button', { name: 'Meet AdaptBuddy' }));

    expect(mockSetProfile).toHaveBeenCalledWith(expect.objectContaining({
      neuro_types: [],
      onboarding_completed: true,
      companion_onboarding_completed: true,
    }));
    expect(mockSetProfile).not.toHaveBeenCalledWith(expect.objectContaining({
      neuro_types: ['autism'],
    }));
  });
});
