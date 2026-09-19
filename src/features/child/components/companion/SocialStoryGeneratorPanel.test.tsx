import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import SocialStoryGeneratorPanel from './SocialStoryGeneratorPanel';

const mockGenerateSocialStory = jest.fn();
const mockAddSocialStory = jest.fn();
const mockAuthState = {
  user: { id: 'child-a' } as { id: string } | null,
  profile: {
    id: 'child-a',
    role: 'child',
    first_name: 'Alex',
    age: 10,
  } as { id: string; role: string; first_name: string; age: number } | null,
  isGuest: false,
};
const mockAutismState = {
  ownerId: 'child-a' as string | null,
  hydrationStatus: 'ready',
  profile: { childId: 'child-a' },
  addSocialStory: mockAddSocialStory,
};

jest.mock('services/ai', () => ({
  buildCompanionContext: jest.fn(() => ({})),
  generateSocialStory: (...args: unknown[]) => mockGenerateSocialStory(...args),
  isOpenAiConfigured: true,
}));

jest.mock('hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockAuthState.user,
    profile: mockAuthState.profile,
  }),
}));

jest.mock('store/authStore', () => ({
  useAuthStore: {
    getState: () => mockAuthState,
  },
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

const setReadyChild = (childId: string) => {
  mockAuthState.user = { id: childId };
  mockAuthState.profile = {
    id: childId,
    role: 'child',
    first_name: 'Alex',
    age: 10,
  };
  mockAuthState.isGuest = false;
  mockAutismState.ownerId = childId;
  mockAutismState.hydrationStatus = 'ready';
  mockAutismState.profile = { childId };
};

describe('SocialStoryGeneratorPanel child ownership', () => {
  beforeEach(() => {
    setReadyChild('child-a');
    mockGenerateSocialStory.mockReset();
    mockAddSocialStory.mockReset();
  });

  it('discards an in-flight story after the authenticated child changes', async () => {
    let resolveStory!: (story: { title: string; panels: string[] }) => void;
    mockGenerateSocialStory.mockImplementation(
      () => new Promise((resolve) => { resolveStory = resolve; }),
    );

    const { rerender } = render(<SocialStoryGeneratorPanel />);
    fireEvent.change(screen.getByPlaceholderText('Describe the situation…'), {
      target: { value: 'A private situation' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create my story' }));

    setReadyChild('child-b');
    rerender(<SocialStoryGeneratorPanel />);

    await act(async () => {
      resolveStory({ title: 'Child A story', panels: ['Only child A should see this.'] });
      await Promise.resolve();
    });

    expect(screen.queryByText('Child A story')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Describe the situation…')).toHaveValue('');
    expect(mockAddSocialStory).not.toHaveBeenCalled();
  });

  it('does not save a generated story after its autism-profile scope stops being ready', async () => {
    mockGenerateSocialStory.mockResolvedValue({
      title: 'Ready story',
      panels: ['A safe panel.'],
    });

    render(<SocialStoryGeneratorPanel />);
    fireEvent.change(screen.getByPlaceholderText('Describe the situation…'), {
      target: { value: 'A new situation' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create my story' }));

    expect(await screen.findByText('Ready story')).toBeInTheDocument();
    mockAutismState.hydrationStatus = 'loading';
    fireEvent.click(screen.getByRole('button', { name: 'Save to Autism Space' }));

    expect(mockAddSocialStory).not.toHaveBeenCalled();
    expect(screen.queryByText('Saved to my stories')).not.toBeInTheDocument();
  });

  it('discards an in-flight story when the autism-profile scope stops being ready', async () => {
    let resolveStory!: (story: { title: string; panels: string[] }) => void;
    mockGenerateSocialStory.mockImplementation(
      () => new Promise((resolve) => { resolveStory = resolve; }),
    );

    render(<SocialStoryGeneratorPanel />);
    fireEvent.change(screen.getByPlaceholderText('Describe the situation…'), {
      target: { value: 'A private situation' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create my story' }));
    mockAutismState.hydrationStatus = 'loading';

    await act(async () => {
      resolveStory({ title: 'Stale story', panels: ['This must be discarded.'] });
      await Promise.resolve();
    });

    expect(screen.queryByText('Stale story')).not.toBeInTheDocument();
    expect(mockAddSocialStory).not.toHaveBeenCalled();
  });
});
