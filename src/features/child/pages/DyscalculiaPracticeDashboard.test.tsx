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
  prepareReadyChildScope('child-a', ['dyscalculia']);
});
afterEach(() => { cleanup(); clearReadyChildScope(); jest.useRealTimers(); Reflect.deleteProperty(document, 'hidden'); });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const open = (title: string) => {
  render(<MemoryRouter><ChildDashboardPage /></MemoryRouter>);
  fireEvent.click(screen.getByText('More tools and progress'));
  const card = screen.getByRole('heading', { name: title }).closest('li')!;
  const launch = within(card).getByRole('button', { name: 'Start activity' });
  launch.focus(); fireEvent.click(launch);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Mark Complete' })).not.toBeInTheDocument();
  return launch;
};
const readyPattern = () => {
  click('Use Triangle'); click('Missing block 2'); click('Use Triangle'); click('Check my pattern');
  fireEvent.click(screen.getByRole('checkbox'));
};
const readyStory = () => {
  fireEvent.change(screen.getByRole('combobox', { name: 'My answer' }), { target: { value: '0' } });
  click('Check my answer'); fireEvent.click(screen.getByRole('checkbox'));
};

test.each([
  ['Pattern Block Puzzle', 'dyscalculia-pattern-blocks', 'Record pattern practice', 3],
  ['Kitchen Math Story', 'dyscalculia-real-world', 'Record story practice', 5],
] as const)('%s records a real reviewed attempt without falsely increasing correct-answer metrics', (title, id, finish, stars) => {
  open(title); if (id === 'dyscalculia-pattern-blocks') readyPattern(); else readyStory();
  act(() => { jest.advanceTimersByTime(12000); }); click(finish);
  const progress = useChildProgressStore.getState();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(progress.completions).toEqual([expect.objectContaining({ activityId: id, neuroId: 'dyscalculia', starsEarned: stars, durationMinutes: 0.2 })]);
  expect(progress.starsTotal).toBe(stars); expect(progress.metricValues).toEqual([]);
  expect(progress.dyscalculiaSessions).toEqual([]);
  expect(Object.keys(progress.completions[0]).sort()).toEqual(['activityId', 'completedAt', 'durationMinutes', 'neuroId', 'starsEarned'].sort());
  expect(screen.getByText(id === 'dyscalculia-pattern-blocks' ? 'Pattern practices: 1' : 'Story practices: 1')).toBeInTheDocument();
});

test.each(['Pattern Block Puzzle', 'Kitchen Math Story'])('%s guest completion remains scoped and does not create persistent answer storage', title => {
  prepareReadyChildScope('guest-child', ['dyscalculia']); useAuthStore.setState({ user: null, session: null, isGuest: true });
  const before = { ...localStorage }; open(title);
  if (title === 'Pattern Block Puzzle') { readyPattern(); click('Record pattern practice'); }
  else { readyStory(); click('Record story practice'); }
  expect(useChildProgressStore.getState().ownerId).toBe('guest-child');
  expect(useChildProgressStore.getState().completions).toHaveLength(1); expect({ ...localStorage }).toEqual(before);
});

test('Escape discards unfinished choices and returns focus to the real launch button', () => {
  const launch = open('Pattern Block Puzzle'); readyPattern();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(useChildProgressStore.getState().completions).toHaveLength(0); expect(launch).toHaveFocus();
  fireEvent.click(launch); expect(screen.getByRole('checkbox')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Record pattern practice' })).toBeDisabled();
});

test('paused maths controls are excluded from the modal focus loop', () => {
  open('Kitchen Math Story'); readyStory(); click('Pause maths practice');
  const resume = screen.getByRole('button', { name: 'Continue maths practice' });
  resume.focus(); fireEvent.keyDown(resume, { key: 'Tab' });
  expect(screen.getByRole('button', { name: 'Close activity' })).toHaveFocus();
  fireEvent.keyDown(screen.getByRole('button', { name: 'Close activity' }), { key: 'Tab', shiftKey: true });
  expect(resume).toHaveFocus();
});

test.each(['Pattern Block Puzzle', 'Kitchen Math Story'])('%s cannot award a new child after an account switch', title => {
  open(title); if (title === 'Pattern Block Puzzle') readyPattern(); else readyStory();
  act(() => { prepareReadyChildScope('child-b', ['dyscalculia']); });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(useChildProgressStore.getState().completions).toEqual([]);
});

test('a stale progress owner cannot launch either maths practice', () => {
  useChildProgressStore.setState({ ownerId: 'child-b' });
  render(<MemoryRouter><ChildDashboardPage /></MemoryRouter>);
  fireEvent.click(screen.getByText('More tools and progress'));
  ['Pattern Block Puzzle', 'Kitchen Math Story'].forEach(title => {
    const card = screen.getByRole('heading', { name: title }).closest('li')!;
    fireEvent.click(within(card).getByRole('button', { name: 'Start activity' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  expect(useChildProgressStore.getState().completions).toEqual([]);
});
