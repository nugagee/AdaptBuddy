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
  prepareReadyChildScope('child-a', ['executive-function']);
});
afterEach(() => { cleanup(); clearReadyChildScope(); jest.useRealTimers(); Reflect.deleteProperty(document, 'hidden'); });

const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const openTool = (title: string) => {
  render(<MemoryRouter><ChildDashboardPage /></MemoryRouter>);
  fireEvent.click(screen.getByText('More tools and progress'));
  const card = screen.getByRole('heading', { name: title }).closest('li');
  if (!card) throw new Error('Missing real activity card');
  const launch = within(card).getByRole('button', { name: 'Start activity' });
  launch.focus(); fireEvent.click(launch);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Mark Complete' })).not.toBeInTheDocument();
  return launch;
};
const planFirst = () => { click('Look at one instruction.'); click('Ask someone to help'); fireEvent.click(screen.getByRole('checkbox')); };
const choose = (name: string, value: string) => fireEvent.change(screen.getByRole('combobox', { name }), { target: { value } });

test.each([
  ['First Step Planner', 'executive-first-step', 'Record first-step practice'],
  ['Ready-to-Go Checklist', 'executive-ready-checklist', 'Record checklist practice'],
  ['Change of Plan', 'executive-change-plan', 'Record transition practice'],
])('records the real %s dashboard flow with measured time and minimal metadata', (title, id, finish) => {
  openTool(title);
  if (id === 'executive-first-step') planFirst();
  else if (id === 'executive-ready-checklist') {
    ['Something to work on', 'Things I want to use', 'A place that works for me'].forEach((item) => choose(`Status for ${item}`, 'help'));
    fireEvent.click(screen.getByRole('checkbox'));
  } else {
    choose('What is happening now?', 'Reading'); choose('What might come next?', 'Taking a break');
    click('Ask for more time'); fireEvent.click(screen.getByRole('checkbox'));
  }
  act(() => { jest.advanceTimersByTime(12000); }); click(finish);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  const progress = useChildProgressStore.getState();
  expect(progress.completions).toEqual([
    expect.objectContaining({ activityId: id, neuroId: 'executive-function', starsEarned: 3, durationMinutes: 0.2 }),
  ]);
  expect(progress.starsTotal).toBe(3);
  expect(progress.metricValues).toEqual([expect.objectContaining({ neuroId: 'executive-function', value: 1 })]);
  expect(JSON.stringify(progress.completions)).not.toMatch(/Look at one instruction|Ask someone|Reading|Taking a break|Things I want/);
});

test('guest completion stays in the guest scope and does not bind persistent storage', () => {
  prepareReadyChildScope('guest-child', ['executive-function']);
  useAuthStore.setState({ user: null, session: null, isGuest: true });
  const before = { ...window.localStorage };
  openTool('First Step Planner'); planFirst(); click('Record first-step practice');
  expect(useChildProgressStore.getState().ownerId).toBe('guest-child');
  expect(useChildProgressStore.getState().completions).toHaveLength(1);
  expect({ ...window.localStorage }).toEqual(before);
});

test('closing or pressing Escape discards unfinished practice and returns focus', () => {
  const launch = openTool('First Step Planner'); planFirst();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(useChildProgressStore.getState().completions).toHaveLength(0);
  expect(launch).toHaveFocus();
  fireEvent.click(launch);
  expect(screen.getByRole('button', { name: 'Record first-step practice' })).toBeDisabled();
  click('Close activity');
  expect(useChildProgressStore.getState().starsTotal).toBe(0);
});

test('the paused modal excludes hidden practice controls from its focus loop', () => {
  openTool('First Step Planner'); planFirst(); click('Pause planning');
  const resume = screen.getByRole('button', { name: 'Continue planning' });
  resume.focus(); fireEvent.keyDown(resume, { key: 'Tab' });
  expect(screen.getByRole('button', { name: 'Close activity' })).toHaveFocus();
  fireEvent.keyDown(screen.getByRole('button', { name: 'Close activity' }), { key: 'Tab', shiftKey: true });
  expect(resume).toHaveFocus();
  expect(screen.queryByRole('button', { name: 'Record first-step practice' })).not.toBeInTheDocument();
});

test('switching accounts closes the old activity without awarding another child', () => {
  openTool('First Step Planner'); planFirst();
  act(() => { prepareReadyChildScope('child-b', ['executive-function']); });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(useChildProgressStore.getState().ownerId).toBe('child-b');
  expect(useChildProgressStore.getState().completions).toHaveLength(0);
});

test('a stale progress owner cannot launch a dashboard practice', () => {
  prepareReadyChildScope('child-a', ['executive-function']);
  useChildProgressStore.setState({ ownerId: 'child-b' });
  render(<MemoryRouter><ChildDashboardPage /></MemoryRouter>);
  fireEvent.click(screen.getByText('More tools and progress'));
  const card = screen.getByRole('heading', { name: 'First Step Planner' }).closest('li')!;
  fireEvent.click(within(card).getByRole('button', { name: 'Start activity' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(useChildProgressStore.getState().completions).toHaveLength(0);
});

test('checklist reset on close does not carry a discarded draft into the next launch', () => {
  const launch = openTool('Ready-to-Go Checklist');
  choose('Status for Something to work on', 'help'); click('Close activity'); fireEvent.click(launch);
  expect(screen.getByRole('combobox', { name: 'Status for Something to work on' })).toHaveValue('');
  expect(useChildProgressStore.getState().completions).toHaveLength(0);
});
