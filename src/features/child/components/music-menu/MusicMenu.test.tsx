import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import MusicMenu from './MusicMenu';

const mockUseAuth = jest.fn();
const mockGetReadyChildProgressForOwner = jest.fn();
const mockBeginSoundscapeOverride = jest.fn();
const mockEndSoundscapeOverride = jest.fn();

jest.mock('hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('features/child/components/layout/ChildDashboardNavbar', () => () => null);
jest.mock('contexts/musicPlayerContext', () => ({
  useMusicPlayer: () => ({
    beginSoundscapeOverride: mockBeginSoundscapeOverride,
    endSoundscapeOverride: mockEndSoundscapeOverride,
  }),
}));
jest.mock('features/child/store/childProgressReadAccess', () => {
  const mockActual = jest.requireActual('features/child/store/childProgressReadAccess');
  return {
    ...mockActual,
    getCurrentChildScopeId: () => {
      const mockAuth = mockUseAuth();
      return mockActual.resolveChildScopeId({
        userId: mockAuth.user?.id ?? null,
        profileId: mockAuth.profile?.id ?? null,
        profileRole: mockAuth.profile?.role ?? null,
        isGuest: Boolean(mockAuth.isGuest),
      });
    },
    getReadyChildProgressForOwner: (...args: unknown[]) =>
      mockGetReadyChildProgressForOwner(...args),
  };
});

const childAuth = (id = 'child-a', neuroTypes = ['spd']) => ({
  user: { id },
  isGuest: false,
  profile: { id, role: 'child', first_name: 'Love', neuro_types: neuroTypes },
});

class MockAudio {
  static rejectPlay = false;
  static instances: MockAudio[] = [];

  src = '';
  loop = false;
  preload = '';
  volume = 1;
  currentTime = 0;
  pause = jest.fn();
  load = jest.fn();
  addEventListener = jest.fn();
  play = jest.fn(() => (
    MockAudio.rejectPlay ? Promise.reject(new Error('blocked')) : Promise.resolve()
  ));

  constructor() {
    MockAudio.instances.push(this);
  }
}

const renderMenu = (entry: string) => render(
  <MemoryRouter initialEntries={[entry]}>
    <MusicMenu />
  </MemoryRouter>,
);

describe('MusicMenu routed sound-session completion', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    prepareReadyChildScope('child-a', ['spd']);
    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue(childAuth());
    mockGetReadyChildProgressForOwner.mockReset();
    mockBeginSoundscapeOverride.mockReset();
    mockEndSoundscapeOverride.mockReset();
    MockAudio.rejectPlay = false;
    MockAudio.instances = [];
    Object.defineProperty(window, 'Audio', {
      configurable: true,
      value: MockAudio,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    Reflect.deleteProperty(window, 'Audio');
    clearReadyChildScope();
  });

  const startRain = async () => {
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Play Gentle Rain' }));
      await Promise.resolve();
    });
  };

  it('credits trusted catalogue metadata only after five active minutes', async () => {
    const completeActivity = jest.fn();
    mockGetReadyChildProgressForOwner.mockReturnValue({ completeActivity });
    renderMenu('/music?activity=spd-calm-corner&stars=999&duration=1');

    expect(screen.getByText(/play any sound for 5 active minutes/i)).toBeInTheDocument();
    expect(completeActivity).not.toHaveBeenCalled();
    await startRain();

    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1000);
    });

    await waitFor(() => expect(completeActivity).toHaveBeenCalledWith(
      'spd-calm-corner',
      'spd',
      3,
      5,
    ));
    expect(completeActivity).toHaveBeenCalledTimes(1);
  });

  it('does not count paused time', async () => {
    const completeActivity = jest.fn();
    mockGetReadyChildProgressForOwner.mockReturnValue({ completeActivity });
    renderMenu('/music?activity=spd-calm-corner');
    await startRain();

    act(() => {
      jest.advanceTimersByTime(60 * 1000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Pause Gentle Rain' }));
    act(() => {
      jest.advanceTimersByTime(10 * 60 * 1000);
    });

    expect(completeActivity).not.toHaveBeenCalled();
    expect(screen.getByRole('progressbar', { name: 'Active listening time' }))
      .toHaveAttribute('aria-valuenow', '60');
  });

  it('does not credit when browser playback fails', async () => {
    const completeActivity = jest.fn();
    mockGetReadyChildProgressForOwner.mockReturnValue({ completeActivity });
    MockAudio.rejectPlay = true;
    renderMenu('/music?activity=spd-calm-corner');
    await startRain();

    act(() => {
      jest.advanceTimersByTime(10 * 60 * 1000);
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(/browser blocked the sound/i);
    expect(completeActivity).not.toHaveBeenCalled();
  });

  it.each([
    '/music',
    '/music?activity=not-real',
    '/music?activity=dysgraphia-voice-story',
    '/writing-pad?activity=spd-calm-corner',
  ])('does not create a completion mission for an untrusted launch: %s', async (entry) => {
    const completeActivity = jest.fn();
    mockGetReadyChildProgressForOwner.mockReturnValue({ completeActivity });
    renderMenu(entry);
    expect(screen.queryByRole('progressbar', { name: 'Active listening time' })).not.toBeInTheDocument();
    await startRain();
    act(() => {
      jest.advanceTimersByTime(10 * 60 * 1000);
    });
    expect(completeActivity).not.toHaveBeenCalled();
  });

  it('rejects a sound activity outside the child profile', () => {
    mockUseAuth.mockReturnValue(childAuth('child-a', ['autism']));
    renderMenu('/music?activity=spd-calm-corner');
    expect(screen.queryByRole('progressbar', { name: 'Active listening time' })).not.toBeInTheDocument();
  });

  it('fails closed when the progress store owner is stale', async () => {
    mockGetReadyChildProgressForOwner.mockReturnValue(null);
    renderMenu('/music?activity=spd-calm-corner');
    await startRain();
    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1000);
    });
    expect(mockGetReadyChildProgressForOwner).toHaveBeenCalledWith('child-a');
  });
});
