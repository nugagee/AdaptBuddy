import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import BuddyConversationPanel from './BuddyConversationPanel';
import LanguageSimplifierPanel from './LanguageSimplifierPanel';
import MoodCheckInPanel from './MoodCheckInPanel';
import { useChildProgressStore } from 'features/child/store/childProgressStore';

const mockBuildCompanionContext = jest.fn(
  (profile: unknown, preferredName: string, age: number | null) => ({
    profile,
    preferredName,
    age,
  }),
);
const mockSendBuddyMessage = jest.fn();
const mockSimplifyLanguage = jest.fn();
const mockRespondToMoodCheckIn = jest.fn();
const mockSaveMoodCheckIn = jest.fn();

const mockAuthState = {
  user: null as { id: string } | null,
  profile: {
    id: 'guest-child',
    role: 'child',
    first_name: 'Guest',
    age: 10,
  } as {
    id: string;
    role: string;
    first_name: string;
    age: number | null;
  } | null,
  isGuest: true,
};

const mockAutismState = {
  ownerId: 'guest-child' as string | null,
  hydrationStatus: 'ready',
  profile: {
    childId: 'guest-child',
    aboutMe: {
      preferredName: 'Love',
    },
  },
};

jest.mock('services/ai', () => ({
  buildCompanionContext: (profile: unknown, preferredName: string, age: number | null) =>
    mockBuildCompanionContext(profile, preferredName, age),
  isOpenAiConfigured: true,
  respondToMoodCheckIn: (...args: unknown[]) => mockRespondToMoodCheckIn(...args),
  sendBuddyMessage: (...args: unknown[]) => mockSendBuddyMessage(...args),
  simplifyLanguage: (...args: unknown[]) => mockSimplifyLanguage(...args),
}));

jest.mock('hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockAuthState.user,
    profile: mockAuthState.profile,
    isGuest: mockAuthState.isGuest,
  }),
}));

jest.mock('store/authStore', () => ({
  useAuthStore: Object.assign(
    (selector: (state: typeof mockAuthState) => unknown) => selector(mockAuthState),
    { getState: () => mockAuthState },
  ),
}));

jest.mock('features/child/store/autismProfileStore', () => ({
  useAutismProfileStore: Object.assign(
    (selector: (state: typeof mockAutismState) => unknown) => selector(mockAutismState),
    { getState: () => mockAutismState },
  ),
  selectAutismProfileForChild: (state: typeof mockAutismState, childId: string | null) =>
    childId
    && state.ownerId === childId
    && state.profile.childId === childId
    && state.hydrationStatus === 'ready'
      ? state.profile
      : null,
}));

jest.mock('services/supabase/autismProfileService', () => ({
  saveMoodCheckIn: (...args: unknown[]) => mockSaveMoodCheckIn(...args),
}));

jest.mock(
  'components/support/SupportRequestAction',
  () => () => null,
  { virtual: true },
);

const setGuestChild = () => {
  mockAuthState.user = null;
  mockAuthState.profile = {
    id: 'guest-child',
    role: 'child',
    first_name: 'Guest',
    age: 10,
  };
  mockAuthState.isGuest = true;
  mockAutismState.ownerId = 'guest-child';
  mockAutismState.hydrationStatus = 'ready';
  mockAutismState.profile = {
    childId: 'guest-child',
    aboutMe: { preferredName: 'Love' },
  };
  useChildProgressStore.getState().resetForChild('guest-child');
  useChildProgressStore.getState().markReady('guest-child');
};

const setRegisteredChild = (childId: string) => {
  mockAuthState.user = { id: childId };
  mockAuthState.profile = {
    id: childId,
    role: 'child',
    first_name: 'Alex',
    age: 11,
  };
  mockAuthState.isGuest = false;
  mockAutismState.ownerId = childId;
  mockAutismState.hydrationStatus = 'ready';
  mockAutismState.profile = {
    childId,
    aboutMe: { preferredName: 'Alex' },
  };
};

describe('guest Support Passport hand-off', () => {
  beforeEach(() => {
    setGuestChild();
    mockBuildCompanionContext.mockClear();
    mockSendBuddyMessage.mockReset();
    mockSimplifyLanguage.mockReset();
    mockRespondToMoodCheckIn.mockReset();
    mockSaveMoodCheckIn.mockReset();
  });

  afterEach(() => {
    useChildProgressStore.getState().resetForChild(null);
  });

  it('uses the guest child Support Passport and preferred name for Buddy context', async () => {
    mockSendBuddyMessage.mockResolvedValue({
      content: 'Let us take one small step.',
      riskLevel: 'low',
      adultActionRequired: false,
    });

    render(<BuddyConversationPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Make this easier' }));

    expect(await screen.findByText('Let us take one small step.')).toBeInTheDocument();
    expect(mockBuildCompanionContext).toHaveBeenCalledWith(
      mockAutismState.profile,
      'Love',
      10,
    );
    expect(mockSendBuddyMessage).toHaveBeenCalledWith(
      'Make this easier',
      expect.objectContaining({ preferredName: 'Love', profile: mockAutismState.profile }),
      expect.any(Array),
    );
  });

  it('keeps a guest mood check-in in ready session progress and never calls Supabase', async () => {
    mockRespondToMoodCheckIn.mockResolvedValue({
      response: 'Thank you for telling me.',
      suggestion: 'Try one slow breath.',
      riskLevel: 'low',
      adultActionRequired: false,
    });

    render(<MoodCheckInPanel />);
    fireEvent.click(screen.getByRole('button', { name: /Worried/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Share with AdaptBuddy' }));

    expect(await screen.findByText('Thank you for telling me.')).toBeInTheDocument();
    expect(useChildProgressStore.getState().todayMood).toBe('worried');
    expect(screen.getByText('Saved for this guest session only ✓')).toBeInTheDocument();
    expect(mockSaveMoodCheckIn).not.toHaveBeenCalled();
  });

  it('clears the panel and discards a delayed result after the child scope changes', async () => {
    let resolveSimplification!: (value: { simplified: string[]; tip?: string }) => void;
    mockSimplifyLanguage.mockImplementation(
      () => new Promise((resolve) => { resolveSimplification = resolve; }),
    );

    const { rerender } = render(<LanguageSimplifierPanel />);
    fireEvent.change(screen.getByLabelText('Text to simplify'), {
      target: { value: 'Private words from Love' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Simplify for me' }));

    setRegisteredChild('child-b');
    rerender(<LanguageSimplifierPanel />);

    await act(async () => {
      resolveSimplification({ simplified: ['Love-only result'] });
      await Promise.resolve();
    });

    expect(screen.getByLabelText('Text to simplify')).toHaveValue('');
    expect(screen.queryByText('Love-only result')).not.toBeInTheDocument();
  });
});
