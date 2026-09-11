import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import ChildDashboardPage from './ChildDashboardPage';

jest.mock('hooks/useAuth', () => {
  const mockStore = jest.requireActual('store/authStore');
  return { useAuth: () => mockStore.useAuthStore.getState() };
});
jest.mock('features/child/services/adhdSupportSignalService', () => ({ syncAdhdSupportSignal: jest.fn() }));
jest.mock('features/child/components/layout/ChildDashboardNavbar', () => () => null);
jest.mock('features/child/components/journal/FeelingsJournal', () => () => null);
jest.mock('features/child/components/dashboard/DashboardHero', () => () => null);
jest.mock('features/child/components/dashboard/DailyOrbitProgress', () => () => null);
jest.mock('features/child/components/dashboard/MetricsConstellation', () => () => null);
jest.mock('features/child/components/dashboard/AccessibilityDock', () => () => null);
jest.mock('features/child/components/dashboard/SmartRecommendationsPanel', () => () => null);
jest.mock('features/child/components/dashboard/FocusTimerModal', () => () => null);
jest.mock('features/child/components/dashboard/ChildClassroomPanel', () => () => null);
jest.mock('features/child/components/dashboard/TeacherAssignmentsPanel', () => () => null);
jest.mock('features/child/components/NowNextLaterBoard', () => () => null);
jest.mock('components/auth/AuthSuccessBanner', () => () => null);

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-12T10:00:00Z'));
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  prepareReadyChildScope('visual-child', ['visual-stress']);
});
afterEach(() => {
  clearReadyChildScope();
  jest.clearAllTimers();
  jest.useRealTimers();
  Reflect.deleteProperty(document, 'hidden');
});

const openTool = (title: string) => {
  render(<MemoryRouter><ChildDashboardPage /></MemoryRouter>);
  const card = screen.getByRole('heading', { name: title }).closest('li');
  if (!card) throw new Error(`Missing activity card: ${title}`);
  fireEvent.click(within(card).getByRole('button', { name: 'Start activity' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  // The modal's old generic completion button must not bypass the new gates.
  expect(screen.queryByRole('button', { name: /Mark Complete/i })).not.toBeInTheDocument();
};

it('launches the real comfort reader and records the measured time and catalogue reward', () => {
  openTool('Comfort Read Session');
  expect(useChildProgressStore.getState().completions).toEqual([]);
  act(() => { jest.advanceTimersByTime(12000); });
  fireEvent.click(screen.getByRole('button', { name: 'I read this line' }));
  fireEvent.click(screen.getByRole('button', { name: 'Record reading session' }));
  expect(useChildProgressStore.getState().completions).toEqual([
    expect.objectContaining({ activityId: 'visual-comfort-read', neuroId: 'visual-stress', starsEarned: 3, durationMinutes: 0.2 }),
  ]);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('launches the layout lab and records only after a layout trial', () => {
  openTool('Font & Spacing Lab');
  fireEvent.change(screen.getByLabelText('Font style'), { target: { value: 'mono' } });
  expect(useChildProgressStore.getState().completions).toEqual([]);
  fireEvent.click(screen.getByLabelText('I tried this layout'));
  act(() => { jest.advanceTimersByTime(6000); });
  fireEvent.click(screen.getByRole('button', { name: 'Record layout practice' }));
  expect(useChildProgressStore.getState().completions).toEqual([
    expect.objectContaining({ activityId: 'visual-font-lab', neuroId: 'visual-stress', starsEarned: 2, durationMinutes: 0.1 }),
  ]);
});

it('launches Screen Break without recording a reward when the timer expires alone', () => {
  jest.setSystemTime(new Date('2026-09-11T10:00:00Z'));
  openTool('Screen Break');
  fireEvent.click(screen.getByRole('button', { name: 'Start break' }));
  act(() => { jest.advanceTimersByTime(20000); });
  expect(useChildProgressStore.getState().completions).toEqual([]);
  fireEvent.click(screen.getByRole('button', { name: /I took my break/ }));
  expect(useChildProgressStore.getState().completions).toEqual([
    expect.objectContaining({ activityId: 'visual-break-2020', neuroId: 'visual-stress', starsEarned: 2, durationMinutes: 20 / 60 }),
  ]);
});

it('closing a partly used tool does not record a completion', () => {
  openTool('Comfort Read Session');
  fireEvent.click(screen.getByRole('button', { name: 'I read this line' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close activity' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(useChildProgressStore.getState().completions).toEqual([]);
});

it('keeps keyboard focus in the dialog and lets Escape close without reward', () => {
  openTool('Comfort Read Session');
  expect(screen.getByRole('button', { name: 'Close activity' })).toHaveFocus();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(useChildProgressStore.getState().completions).toEqual([]);
});

it('does not transfer an open activity or its completion to a newly selected child', () => {
  openTool('Comfort Read Session');
  fireEvent.click(screen.getByRole('button', { name: 'I read this line' }));
  const oldRecord = screen.getByRole('button', { name: 'Record reading session' });
  act(() => {
    prepareReadyChildScope('another-child', ['visual-stress']);
    fireEvent.click(oldRecord);
  });
  expect(useChildProgressStore.getState().ownerId).toBe('another-child');
  expect(useChildProgressStore.getState().completions).toEqual([]);
});
