import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PronunciationBuddyPage, {
  getPronunciationStorageKey,
} from './PronunciationBuddyPage';

const mockUseAuth = jest.fn();
const mockGetReadyChildProgressForOwner = jest.fn();
const mockGetAssignments = jest.fn();
const mockSaveProgress = jest.fn();

jest.mock('hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('features/child/components/layout/ChildDashboardNavbar', () => () => (
  <div data-testid="child-navbar" />
));
jest.mock('features/child/services/childAssignmentService', () => ({
  ChildAssignmentService: {
    getAssignments: (...args: unknown[]) => mockGetAssignments(...args),
    saveProgress: (...args: unknown[]) => mockSaveProgress(...args),
  },
}));
jest.mock('features/child/store/childProgressReadAccess', () => {
  const actual = jest.requireActual('features/child/store/childProgressReadAccess');
  return {
    ...actual,
    getCurrentChildScopeId: () => {
      const auth = mockUseAuth();
      return actual.resolveChildScopeId({
        userId: auth.user?.id ?? null,
        profileId: auth.profile?.id ?? null,
        profileRole: auth.profile?.role ?? null,
        isGuest: Boolean(auth.isGuest),
      });
    },
    getReadyChildProgressForOwner: (...args: unknown[]) =>
      mockGetReadyChildProgressForOwner(...args),
  };
});

const childAuth = (id = 'child-a', neuroTypes = ['autism']) => ({
  user: { id },
  isGuest: false,
  profile: { id, role: 'child', first_name: id === 'child-a' ? 'Love' : 'Sam', neuro_types: neuroTypes },
});

const guestAuth = () => ({
  user: null,
  isGuest: true,
  profile: { id: 'guest-child', role: 'child', first_name: 'Love', neuro_types: ['autism'] },
});

const renderPage = (entry: string | { pathname: string; search?: string; state?: unknown }) => render(
  <MemoryRouter initialEntries={[entry]}>
    <PronunciationBuddyPage />
  </MemoryRouter>,
);

describe('Pronunciation Buddy privacy and routed completion', () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseAuth.mockReset();
    mockGetReadyChildProgressForOwner.mockReset();
    mockGetAssignments.mockReset();
    mockSaveProgress.mockReset();
    mockUseAuth.mockReturnValue(childAuth());
    mockGetAssignments.mockResolvedValue([]);
    mockSaveProgress.mockResolvedValue(undefined);
  });

  it('completes a trusted route after a real private self-check', () => {
    const completeActivity = jest.fn();
    mockGetReadyChildProgressForOwner.mockReturnValue({ completeActivity });
    renderPage('/pronunciation-buddy?activity=autism-pronunciation-buddy&stars=999');

    expect(completeActivity).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'I said it myself' }));
    expect(completeActivity).toHaveBeenCalledWith(
      'autism-pronunciation-buddy',
      'autism',
      3,
      8,
    );
  });

  it('does not complete on help-only or direct-tool practice', () => {
    const completeActivity = jest.fn();
    mockGetReadyChildProgressForOwner.mockReturnValue({ completeActivity });
    const { unmount } = renderPage('/pronunciation-buddy?activity=autism-pronunciation-buddy');
    fireEvent.click(screen.getByRole('button', { name: 'I need help' }));
    expect(completeActivity).not.toHaveBeenCalled();

    unmount();
    renderPage('/pronunciation-buddy');
    fireEvent.click(screen.getByRole('button', { name: 'I said it myself' }));
    expect(completeActivity).not.toHaveBeenCalled();
  });

  it('keeps guest words, attempts and mic consent out of localStorage', () => {
    mockUseAuth.mockReturnValue(guestAuth());
    mockGetReadyChildProgressForOwner.mockReturnValue({ completeActivity: jest.fn() });
    renderPage('/pronunciation-buddy?activity=autism-pronunciation-buddy');

    fireEvent.click(screen.getByRole('button', { name: 'Allow mic for practice' }));
    fireEvent.change(screen.getByPlaceholderText('Name, word, or short sentence'), {
      target: { value: 'guest private phrase' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add to practice' }));
    fireEvent.click(screen.getByRole('button', { name: 'I said it myself' }));

    expect(Object.keys(localStorage).filter((key) => key.startsWith('adaptbuddy-pronunciation-')))
      .toEqual([]);
  });

  it('stores no browser-recognised words in registered practice history', async () => {
    type Handler = ((event: any) => void) | null;
    let recognition: {
      onresult: Handler;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: jest.Mock;
      stop: jest.Mock;
      abort: jest.Mock;
    } | null = null;

    class MockRecognition {
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      lang = '';
      onresult: Handler = null;
      onerror: (() => void) | null = null;
      onend: (() => void) | null = null;
      start = jest.fn();
      stop = jest.fn();
      abort = jest.fn();

      constructor() {
        recognition = this;
      }
    }

    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      value: MockRecognition,
    });
    mockGetReadyChildProgressForOwner.mockReturnValue({ completeActivity: jest.fn() });
    renderPage('/pronunciation-buddy?activity=autism-pronunciation-buddy');
    fireEvent.click(screen.getByRole('button', { name: 'Allow mic for practice' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use mic' }));

    act(() => {
      recognition!.onresult!({
        results: { length: 1, 0: { 0: { transcript: 'private recognised sentence' } } },
      });
      recognition!.onend!();
    });

    const stored = localStorage.getItem(getPronunciationStorageKey('child-a', 'attempts')) ?? '';
    expect(stored).toContain('Microphone practice completed');
    expect(stored).not.toContain('private recognised sentence');
    expect(await screen.findByText(/recognised words and raw audio were not stored/i)).toBeInTheDocument();
    Reflect.deleteProperty(window, 'SpeechRecognition');
  });

  it('clears child A state and rejects a queued recognition callback after switching child', () => {
    const key = getPronunciationStorageKey('child-a', 'custom-items');
    localStorage.setItem(key, JSON.stringify([{
      id: 'private-a',
      category: 'everyday',
      label: 'Child A secret phrase',
      phrase: 'Child A secret phrase',
      hint: 'private',
      breakdown: ['private'],
      example: 'private',
      difficulty: 'gentle',
    }]));
    const { rerender } = renderPage('/pronunciation-buddy');
    expect(screen.getByText('Child A secret phrase')).toBeInTheDocument();

    mockUseAuth.mockReturnValue(childAuth('child-b'));
    rerender(
      <MemoryRouter initialEntries={['/pronunciation-buddy']}>
        <PronunciationBuddyPage />
      </MemoryRouter>,
    );
    expect(screen.queryByText('Child A secret phrase')).not.toBeInTheDocument();
  });

  it('verifies a teacher assignment before any completion write', async () => {
    const state = {
      assignmentPractice: {
        assignmentId: 'injected-assignment',
        title: 'Injected task',
        phrase: 'hello',
      },
    };
    renderPage({ pathname: '/pronunciation-buddy', state });
    fireEvent.click(screen.getByRole('button', { name: 'I said it myself' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));

    await waitFor(() => expect(mockGetAssignments).toHaveBeenCalledWith('child-a'));
    expect(mockSaveProgress).not.toHaveBeenCalled();
    expect(await screen.findByText(/could not be verified/i)).toBeInTheDocument();
  });
});
