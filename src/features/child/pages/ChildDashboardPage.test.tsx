import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { syncAdhdSupportSignal } from 'features/child/services/adhdSupportSignalService';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import ChildDashboardPage from './ChildDashboardPage';

let mockNeuroTypes = ['adhd'];

jest.mock('hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'child-123' },
    isGuest: false,
    profile: {
      id: 'child-123',
      role: 'child',
      first_name: 'Ari',
      neuro_types: mockNeuroTypes,
    },
  }),
}));

jest.mock('features/child/services/adhdSupportSignalService', () => ({
  syncAdhdSupportSignal: jest.fn(),
}));

jest.mock('features/child/components/layout/ChildDashboardNavbar', () => () => null);
jest.mock('features/child/components/journal/FeelingsJournal', () => () => null);
jest.mock('features/child/components/dashboard/DashboardHero', () => () => null);
jest.mock('features/child/components/dashboard/DailyOrbitProgress', () => () => null);
jest.mock('features/child/components/dashboard/MetricsConstellation', () => () => null);
jest.mock('features/child/components/dashboard/AccessibilityDock', () => () => null);
jest.mock('features/child/components/dashboard/SmartRecommendationsPanel', () => () => null);
jest.mock('features/child/components/dashboard/FocusTimerModal', () => () => null);
jest.mock('features/child/components/dashboard/AdhdSupportSignalsPanel', () => () => null);
jest.mock('features/child/components/dashboard/AdhdEnergyPacingPanel', () => () => null);
jest.mock('features/child/components/dashboard/AchievementBadgesPanel', () => () => null);
jest.mock('features/child/components/dashboard/DyslexiaReadingProgressPanel', () => () => null);
jest.mock('features/child/components/dashboard/ChildClassroomPanel', () => () => null);
jest.mock('features/child/components/dashboard/TeacherAssignmentsPanel', () => () => null);
jest.mock('features/child/components/NowNextLaterBoard', () => () => null);
jest.mock('components/auth/AuthSuccessBanner', () => () => null);

const mockSyncAdhdSupportSignal = syncAdhdSupportSignal as jest.MockedFunction<
  typeof syncAdhdSupportSignal
>;

const resetProgressStore = () => {
  prepareReadyChildScope('child-123', mockNeuroTypes);
  useChildProgressStore.setState({
    completions: [],
    metricValues: [],
    adhdSupportSignals: [],
    achievementBadges: [],
    adhdEnergyPacing: null,
    dyslexiaReadingSessions: [],
    dyslexiaReaderPreferences: null,
    dyslexiaPhonicsSessions: [],
    starsTotal: 0,
    streakDays: 0,
    lastActiveDate: '',
    todayMood: null,
    focusMinutesToday: 0,
  });
};

describe('ChildDashboardPage ADHD signal handoff', () => {
  beforeEach(() => {
    mockNeuroTypes = ['adhd'];
    window.localStorage.clear();
    resetProgressStore();
    mockSyncAdhdSupportSignal.mockReset();
  });

  afterEach(() => {
    clearReadyChildScope();
    jest.restoreAllMocks();
  });

  it('keeps the completion and support signal locally when cloud sync fails', async () => {
    const syncError = new Error('offline');
    mockSyncAdhdSupportSignal.mockRejectedValue(syncError);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    render(
      <MemoryRouter>
        <ChildDashboardPage />
      </MemoryRouter>,
    );

    const focusCoachCard = screen
      .getByRole('heading', { name: 'ADHD Focus Coach' })
      .closest('li');
    if (!focusCoachCard) throw new Error('Could not find the ADHD Focus Coach card');

    fireEvent.click(within(focusCoachCard).getByRole('button', { name: 'Start activity' }));
    fireEvent.click(screen.getByRole('button', { name: /mark complete/i }));

    await waitFor(() => {
      expect(mockSyncAdhdSupportSignal).toHaveBeenCalledWith(
        expect.objectContaining({
          childId: 'child-123',
          activityId: 'adhd-focus-coach',
          activityTitle: 'ADHD Focus Coach',
          signal: expect.objectContaining({
            energyId: 'scattered',
            rescueReason: 'too many steps',
          }),
        }),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        'ADHD support signal saved locally only:',
        syncError,
      );
    });

    const progress = useChildProgressStore.getState();
    expect(progress.completions).toEqual([
      expect.objectContaining({
        activityId: 'adhd-focus-coach',
        neuroId: 'adhd',
        starsEarned: 5,
      }),
    ]);
    expect(progress.adhdSupportSignals).toEqual([
      expect.objectContaining({
        activityId: 'adhd-focus-coach',
        energyId: 'scattered',
        rescueReason: 'too many steps',
      }),
    ]);

    warnSpy.mockRestore();
  });

  it('persists the Quest Chain badge after the activity closes', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-05T09:30:00.000Z'));

    try {
      render(
        <MemoryRouter>
          <ChildDashboardPage />
        </MemoryRouter>,
      );

      const questChainCard = screen
        .getByRole('heading', { name: 'Quest Chain' })
        .closest('li');
      if (!questChainCard) throw new Error('Could not find the Quest Chain card');

      fireEvent.click(within(questChainCard).getByRole('button', { name: 'Start activity' }));
      fireEvent.click(screen.getByRole('button', { name: 'Complete win 1' }));
      fireEvent.click(screen.getByRole('button', { name: 'Complete win 2' }));
      fireEvent.click(screen.getByRole('button', { name: 'Complete win 3' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save badge and finish' }));

      expect(useChildProgressStore.getState().achievementBadges).toEqual([
        expect.objectContaining({
          id: 'adhd-chain-builder',
          title: 'Chain Builder',
          unlockedAt: '2026-09-05T09:30:00.000Z',
        }),
      ]);
      expect(useChildProgressStore.getState().completions).toEqual([
        expect.objectContaining({
          activityId: 'adhd-quest-chain',
          starsEarned: 6,
        }),
      ]);
    } finally {
      jest.useRealTimers();
    }
  });

  it('persists Energy Check-In pacing and shares its support signal', async () => {
    mockSyncAdhdSupportSignal.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <ChildDashboardPage />
      </MemoryRouter>,
    );

    const energyCheckCard = screen
      .getByRole('heading', { name: 'Energy Check-In' })
      .closest('li');
    if (!energyCheckCard) throw new Error('Could not find the Energy Check-In card');

    fireEvent.click(within(energyCheckCard).getByRole('button', { name: 'Start activity' }));
    fireEvent.click(screen.getByRole('button', { name: /^low battery/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Use this pacing plan' }));

    expect(useChildProgressStore.getState().adhdEnergyPacing).toEqual(
      expect.objectContaining({
        energyId: 'low',
        taskMinutes: 5,
        breakMinutes: 3,
      }),
    );
    expect(useChildProgressStore.getState().completions).toEqual([
      expect.objectContaining({
        activityId: 'adhd-mood-check',
        starsEarned: 2,
      }),
    ]);
    await waitFor(() => {
      expect(mockSyncAdhdSupportSignal).toHaveBeenCalledWith(
        expect.objectContaining({
          childId: 'child-123',
          activityId: 'adhd-mood-check',
          signal: expect.objectContaining({ energyId: 'low' }),
        }),
      );
    });
  });

  it('persists Read-Aloud Adventure progress after the reader closes', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-02T09:30:00.000Z'));
    mockNeuroTypes = ['dyslexia'];
    prepareReadyChildScope('child-123', mockNeuroTypes);

    try {
      render(
        <MemoryRouter>
          <ChildDashboardPage />
        </MemoryRouter>,
      );

      const readAloudCard = screen
        .getByRole('heading', { name: 'Read-Aloud Adventure' })
        .closest('li');
      if (!readAloudCard) throw new Error('Could not find the Read-Aloud Adventure card');

      fireEvent.click(within(readAloudCard).getByRole('button', { name: 'Start activity' }));
      fireEvent.click(screen.getByRole('button', { name: 'Mark sentence complete' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save partial reading' }));

      expect(useChildProgressStore.getState().dyslexiaReadingSessions).toEqual([
        expect.objectContaining({
          passageId: 'moon-garden',
          sentencesCompleted: 1,
          totalSentences: 4,
          wordsRead: 7,
        }),
      ]);
      expect(useChildProgressStore.getState().completions).toEqual([
        expect.objectContaining({
          activityId: 'dyslexia-read-aloud',
          starsEarned: 4,
        }),
      ]);
    } finally {
      jest.useRealTimers();
    }
  });

  it('persists Colored Overlay Reader progress and comfort preferences', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-02T10:00:00.000Z'));
    mockNeuroTypes = ['dyslexia'];
    prepareReadyChildScope('child-123', mockNeuroTypes);

    try {
      render(
        <MemoryRouter>
          <ChildDashboardPage />
        </MemoryRouter>,
      );

      const overlayCard = screen
        .getByRole('heading', { name: 'Colored Overlay Reader' })
        .closest('li');
      if (!overlayCard) throw new Error('Could not find the Colored Overlay Reader card');

      fireEvent.click(within(overlayCard).getByRole('button', { name: 'Start activity' }));
      fireEvent.click(screen.getByRole('button', { name: 'Blue' }));
      fireEvent.click(screen.getByRole('button', { name: 'Extra large' }));
      fireEvent.click(screen.getByRole('button', { name: 'I read this line' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save partial overlay reading' }));

      const progress = useChildProgressStore.getState();
      expect(progress.dyslexiaReadingSessions).toEqual([
        expect.objectContaining({
          activityId: 'dyslexia-overlay-read',
          passageId: 'moon-garden',
          sentencesCompleted: 1,
          wordsRead: 7,
        }),
      ]);
      expect(progress.dyslexiaReaderPreferences).toEqual(
        expect.objectContaining({
          overlay: 'blue',
          textSize: 'extra-large',
          readingRuler: true,
          updatedAt: '2026-09-02T10:00:00.000Z',
        }),
      );
      expect(progress.completions).toEqual([
        expect.objectContaining({
          activityId: 'dyslexia-overlay-read',
          starsEarned: 3,
        }),
      ]);
    } finally {
      jest.useRealTimers();
    }
  });

  it('persists Phonics Trace & Say practice from the dashboard activity', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-01T10:30:00.000Z'));
    mockNeuroTypes = ['dyslexia'];
    prepareReadyChildScope('child-123', mockNeuroTypes);

    try {
      render(
        <MemoryRouter>
          <ChildDashboardPage />
        </MemoryRouter>,
      );

      const phonicsCard = screen
        .getByRole('heading', { name: 'Phonics Trace & Say' })
        .closest('li');
      if (!phonicsCard) throw new Error('Could not find the Phonics Trace & Say card');

      fireEvent.click(within(phonicsCard).getByRole('button', { name: 'Start activity' }));
      fireEvent.click(screen.getByRole('button', { name: 'Hear mmm' }));
      fireEvent.click(screen.getByRole('button', { name: 'My trace is ready' }));
      fireEvent.click(screen.getByRole('button', { name: 'I said mmm' }));
      fireEvent.click(screen.getByRole('button', { name: 'Complete m mission' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save phonics practice' }));

      const progress = useChildProgressStore.getState();
      expect(progress.dyslexiaPhonicsSessions).toEqual([
        expect.objectContaining({
          completedSoundIds: ['m-moon'],
          completedSounds: ['mmm'],
          wordsPractised: ['moon'],
          totalSounds: 4,
        }),
      ]);
      expect(progress.completions).toEqual([
        expect.objectContaining({
          activityId: 'dyslexia-phonics-trace',
          starsEarned: 4,
        }),
      ]);
    } finally {
      jest.useRealTimers();
    }
  });
});
