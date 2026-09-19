import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import { ticFlowDraftCache } from '../components/dashboard/ticFlowDraftCache';
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
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-09-11T09:00:00Z'));
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  ticFlowDraftCache.dispose(); prepareReadyChildScope('child-a', ['tourettes']);
});
afterEach(() => { cleanup(); ticFlowDraftCache.dispose(); clearReadyChildScope(); jest.useRealTimers(); Reflect.deleteProperty(document, 'hidden'); });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const review = () => fireEvent.click(screen.getByRole('checkbox'));
const openTool = (title = 'Flex Flow Session') => {
  render(<MemoryRouter><ChildDashboardPage /></MemoryRouter>);
  fireEvent.click(screen.getByText('More tools and progress'));
  const card = screen.getByRole('heading', { name: title }).closest('li');
  if (!card) throw new Error('Missing real Tourette support card');
  const launch = within(card).getByRole('button', { name: 'Start activity' });
  launch.focus(); fireEvent.click(launch); expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Mark Complete' })).not.toBeInTheDocument();
  return launch;
};

test('a real creative completion records measured time and neutral support counts, not cards or symptoms', () => {
  openTool(); click('Add Star'); review(); act(() => { jest.advanceTimersByTime(12000); }); click('Record creative practice');
  const progress = useChildProgressStore.getState();
  expect(progress.completions).toEqual([expect.objectContaining({ activityId: 'tourettes-flex-flow', neuroId: 'tourettes', starsEarned: 4, durationMinutes: 0.2 })]);
  expect(progress.metricValues).toEqual([expect.objectContaining({ neuroId: 'tourettes', value: 1 })]);
  expect(progress.starsTotal).toBe(4); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(JSON.stringify(progress.completions)).not.toMatch(/boardIndex|cards|ticCount|symptom|calmness/);
});

test('a real break-card use is optional and excludes time spent showing the card', () => {
  openTool('Tic Break Pass'); act(() => { jest.advanceTimersByTime(6000); }); click('Show break card');
  act(() => { jest.advanceTimersByTime(180000); });
  expect(useChildProgressStore.getState().completions).toHaveLength(0);
  click('Back to my choices'); review(); act(() => { jest.advanceTimersByTime(6000); }); click('Record support-card use');
  expect(useChildProgressStore.getState().completions).toEqual([expect.objectContaining({ activityId: 'tourettes-tic-break', starsEarned: 2, durationMinutes: 0.2 })]);
  expect(JSON.stringify(useChildProgressStore.getState().completions)).not.toMatch(/messageIndex|breakDuration|approved|ticCount/);
});

test('Escape keeps the same-tab scene without awarding progress and reopening requires fresh review', () => {
  const launch = openTool(); click('Add Star'); review();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(launch).toHaveFocus(); expect(useChildProgressStore.getState().completions).toHaveLength(0);
  fireEvent.click(launch); expect(screen.getByTestId('tic-flow-card')).toHaveTextContent('Star');
  expect(screen.getByRole('checkbox')).not.toBeChecked();
});

test('taking an embedded break before adding a card needs no permission claim or completion', () => {
  openTool(); click('Show break card'); expect(screen.getByRole('region', { name: 'Break support card' })).toBeInTheDocument();
  click('Close activity'); expect(useChildProgressStore.getState().completions).toEqual([]); expect(useChildProgressStore.getState().starsTotal).toBe(0);
});

test('the paused modal focus loop includes the still-available break button but excludes hidden scene controls', () => {
  openTool(); click('Add Star'); click('Pause at any time');
  const show = screen.getByRole('button', { name: 'Show break card' }); show.focus(); fireEvent.keyDown(show, { key: 'Tab' });
  expect(screen.getByRole('button', { name: 'Close activity' })).toHaveFocus();
  expect(screen.queryByRole('button', { name: 'Add Star' })).not.toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole('button', { name: 'Close activity' }), { key: 'Tab', shiftKey: true }); expect(show).toHaveFocus();
});

test('a guest can resume and complete without new persistent draft data', () => {
  prepareReadyChildScope('guest-child', ['tourettes']); useAuthStore.setState({ user: null, isGuest: true });
  const before = { ...localStorage }; const launch = openTool(); click('Add Star'); click('Close activity'); fireEvent.click(launch);
  expect(screen.getByTestId('tic-flow-card')).toHaveTextContent('Star'); review(); click('Record creative practice');
  expect(useChildProgressStore.getState().ownerId).toBe('guest-child'); expect(useChildProgressStore.getState().completions).toHaveLength(1);
  expect({ ...localStorage }).toEqual(before);
});

test('account switching discards the old modal and draft without credit to the new child', () => {
  openTool(); click('Add Star'); review(); act(() => { prepareReadyChildScope('child-b', ['tourettes']); });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(ticFlowDraftCache.read(ticFlowDraftCache.acquire('child-b'))).toBeNull();
  expect(useChildProgressStore.getState().completions).toHaveLength(0);
});

test('changing accounts while the activity is closed also clears its in-memory draft', () => {
  openTool(); click('Add Star'); click('Close activity');
  act(() => { prepareReadyChildScope('child-b', ['tourettes']); prepareReadyChildScope('child-a', ['tourettes']); });
  expect(ticFlowDraftCache.read(ticFlowDraftCache.acquire('child-a'))).toBeNull();
  expect(useChildProgressStore.getState().completions).toHaveLength(0);
});

test('stale ownership blocks launch through the real card', () => {
  useChildProgressStore.setState({ ownerId: 'child-b' });
  render(<MemoryRouter><ChildDashboardPage /></MemoryRouter>); fireEvent.click(screen.getByText('More tools and progress'));
  const card = screen.getByRole('heading', { name: 'Flex Flow Session' }).closest('li')!;
  fireEvent.click(within(card).getByRole('button', { name: 'Start activity' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('finishing clears the draft and the explicit reuse button permits another session without duplicate rewards', () => {
  openTool(); click('Add Star'); review(); click('Record creative practice');
  const originalCompletions = useChildProgressStore.getState().completions;
  const originalMetrics = useChildProgressStore.getState().metricValues;
  expect(ticFlowDraftCache.read(ticFlowDraftCache.acquire('child-a'))).toBeNull();
  click('Use support tool again'); expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.queryByTestId('tic-flow-card')).not.toBeInTheDocument();
  click('Add Moon'); review(); click('Record creative practice');
  expect(useChildProgressStore.getState().completions).toEqual(originalCompletions);
  expect(useChildProgressStore.getState().completions).toHaveLength(1);
  expect(useChildProgressStore.getState().metricValues).toEqual(originalMetrics);
  expect(useChildProgressStore.getState().starsTotal).toBe(4);
  expect(screen.getByText(/no extra stars were added/)).toBeInTheDocument();
});

test('the break pass remains usable after optional daily recording without more stars or extra records', () => {
  openTool('Tic Break Pass'); click('Show break card'); click('Back to my choices'); review(); click('Record support-card use');
  const originalCompletions = useChildProgressStore.getState().completions;
  click('Use support tool again'); click('Show break card');
  expect(screen.getByRole('region', { name: 'Break support card' })).toBeInTheDocument();
  act(() => { jest.advanceTimersByTime(600000); });
  click('Back to my choices'); review(); click('Record support-card use');
  expect(useChildProgressStore.getState().completions).toEqual(originalCompletions);
  expect(useChildProgressStore.getState().starsTotal).toBe(2);
  expect(screen.getByText(/no extra stars were added/)).toBeInTheDocument();
});

test('reusing completed guest support retains the same once-daily reward rule', () => {
  prepareReadyChildScope('guest-child', ['tourettes']); useAuthStore.setState({ user: null, isGuest: true });
  openTool(); click('Add Star'); review(); click('Record creative practice');
  const before = { ...localStorage };
  click('Use support tool again'); click('Show break card'); click('Back to my choices');
  click('Add Star'); review(); click('Record creative practice');
  expect(useChildProgressStore.getState().completions).toHaveLength(1);
  expect(useChildProgressStore.getState().starsTotal).toBe(4);
  expect({ ...localStorage }).toEqual(before);
});
