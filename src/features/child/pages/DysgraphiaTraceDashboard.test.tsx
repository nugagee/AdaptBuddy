import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import ChildDashboardPage from './ChildDashboardPage';

jest.mock('hooks/useAuth', () => {
  const { useAuthStore: mockStore } = jest.requireActual('store/authStore');
  return { useAuth: () => mockStore() };
});
jest.mock('features/child/components/layout/ChildDashboardNavbar', () => () => null);
jest.mock('features/child/components/journal/FeelingsJournal', () => () => null);
jest.mock('features/child/components/dashboard/DashboardHero', () => () => null);
jest.mock('features/child/components/dashboard/DailyOrbitProgress', () => () => null);
jest.mock('features/child/components/dashboard/MetricsConstellation', () => () => null);
jest.mock('features/child/components/dashboard/AccessibilityDock', () => () => null);
jest.mock('features/child/components/dashboard/SmartRecommendationsPanel', () => () => null);
jest.mock('features/child/components/dashboard/ChildClassroomPanel', () => () => null);
jest.mock('features/child/components/dashboard/TeacherAssignmentsPanel', () => () => null);
jest.mock('features/child/components/NowNextLaterBoard', () => () => null);
jest.mock('components/auth/AuthSuccessBanner', () => () => null);

beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-09-10T10:00:00Z'));
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  prepareReadyChildScope('child-a', ['dysgraphia']);
});
afterEach(() => { cleanup(); clearReadyChildScope(); jest.useRealTimers(); Reflect.deleteProperty(document, 'hidden'); });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const openTool = () => {
  render(<MemoryRouter><ChildDashboardPage /></MemoryRouter>);
  fireEvent.click(screen.getByText('More tools and progress'));
  const card = screen.getByRole('heading', { name: 'Trace the Path' }).closest('li');
  if (!card) throw new Error('Missing real tracing card');
  const launch = within(card).getByRole('button', { name: 'Start activity' });
  launch.focus(); fireEvent.click(launch);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Mark Complete' })).not.toBeInTheDocument();
  return launch;
};
const explore = () => { click('Explore stop 1'); fireEvent.click(screen.getByRole('checkbox')); };

test('the real tracing card records honest partial practice and measured time, not its eight-minute estimate', () => {
  openTool(); explore(); act(() => { jest.advanceTimersByTime(12000); }); click('Record path practice');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  const progress = useChildProgressStore.getState();
  expect(progress.completions).toEqual([
    expect.objectContaining({ activityId: 'dysgraphia-trace-path', neuroId: 'dysgraphia', starsEarned: 3, durationMinutes: 0.2 }),
  ]);
  expect(progress.starsTotal).toBe(3);
  expect(progress.metricValues).toEqual([expect.objectContaining({ neuroId: 'dysgraphia', value: 1 })]);
  expect(JSON.stringify(progress.completions)).not.toMatch(/straight|strokes|coordinates|method|reviewed/);
});

test('guest practice uses only guest-scoped progress without new local storage', () => {
  prepareReadyChildScope('guest-child', ['dysgraphia']);
  useAuthStore.setState({ user: null, session: null, isGuest: true });
  const before = { ...localStorage };
  openTool(); explore(); click('Record path practice');
  expect(useChildProgressStore.getState().ownerId).toBe('guest-child');
  expect(useChildProgressStore.getState().completions).toHaveLength(1);
  expect({ ...localStorage }).toEqual(before);
});

test('Escape clears unfinished practice and restores focus, while reopening starts empty', () => {
  const launch = openTool(); explore();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(useChildProgressStore.getState().completions).toHaveLength(0);
  expect(launch).toHaveFocus(); fireEvent.click(launch);
  expect(screen.getByRole('button', { name: 'Record path practice' })).toBeDisabled();
  click('Close activity'); expect(useChildProgressStore.getState().starsTotal).toBe(0);
});

test('paused practice is excluded from the real modal focus loop', () => {
  openTool(); explore(); click('Pause path practice');
  const resume = screen.getByRole('button', { name: 'Continue path practice' });
  resume.focus(); fireEvent.keyDown(resume, { key: 'Tab' });
  expect(screen.getByRole('button', { name: 'Close activity' })).toHaveFocus();
  fireEvent.keyDown(screen.getByRole('button', { name: 'Close activity' }), { key: 'Tab', shiftKey: true });
  expect(resume).toHaveFocus();
  expect(screen.queryByRole('button', { name: 'Record path practice' })).not.toBeInTheDocument();
});

test('switching accounts closes the old tracing tool without awarding the new child', () => {
  openTool(); explore();
  act(() => { prepareReadyChildScope('child-b', ['dysgraphia']); });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(useChildProgressStore.getState().ownerId).toBe('child-b');
  expect(useChildProgressStore.getState().completions).toHaveLength(0);
});

test('a stale progress owner cannot launch the tracing tool', () => {
  useChildProgressStore.setState({ ownerId: 'child-b' });
  render(<MemoryRouter><ChildDashboardPage /></MemoryRouter>);
  fireEvent.click(screen.getByText('More tools and progress'));
  const card = screen.getByRole('heading', { name: 'Trace the Path' }).closest('li')!;
  fireEvent.click(within(card).getByRole('button', { name: 'Start activity' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(useChildProgressStore.getState().completions).toHaveLength(0);
});

test('pausing preserves the open exploration but excludes paused duration from dashboard progress', () => {
  openTool(); explore(); act(() => { jest.advanceTimersByTime(6000); });
  click('Pause path practice'); act(() => { jest.advanceTimersByTime(60000); }); click('Continue path practice');
  expect(screen.getByRole('checkbox')).toBeChecked();
  act(() => { jest.advanceTimersByTime(6000); }); click('Record path practice');
  expect(useChildProgressStore.getState().completions[0]).toEqual(expect.objectContaining({ durationMinutes: 0.2, starsEarned: 3 }));
});
