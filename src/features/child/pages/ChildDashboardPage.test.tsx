import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { syncAdhdSupportSignal } from 'features/child/services/adhdSupportSignalService';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import ChildDashboardPage from './ChildDashboardPage';

jest.mock('hooks/useAuth', () => ({
  useAuth: () => ({
    profile: {
      id: 'child-123',
      first_name: 'Ari',
      neuro_types: ['adhd'],
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
jest.mock('features/child/components/dashboard/ChildClassroomPanel', () => () => null);
jest.mock('features/child/components/dashboard/TeacherAssignmentsPanel', () => () => null);
jest.mock('features/child/components/NowNextLaterBoard', () => () => null);
jest.mock('components/auth/AuthSuccessBanner', () => () => null);

const mockSyncAdhdSupportSignal = syncAdhdSupportSignal as jest.MockedFunction<
  typeof syncAdhdSupportSignal
>;

const resetProgressStore = () => {
  useChildProgressStore.setState({
    completions: [],
    metricValues: [],
    adhdSupportSignals: [],
    starsTotal: 0,
    streakDays: 0,
    lastActiveDate: '',
    todayMood: null,
    focusMinutesToday: 0,
  });
};

describe('ChildDashboardPage ADHD signal handoff', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetProgressStore();
    mockSyncAdhdSupportSignal.mockReset();
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

    fireEvent.click(within(focusCoachCard).getByRole('button', { name: 'Start' }));
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
});
