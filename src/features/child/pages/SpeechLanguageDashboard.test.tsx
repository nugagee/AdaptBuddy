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
  prepareReadyChildScope('child-a', ['speech-language']);
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
const phrasePractice = () => { click('Please show me one step.'); click('I pointed to the card'); };

test.each([
  ['Helpful Phrase Cards', 'speech-language-phrase-cards'],
  ['Sentence Builder', 'speech-language-sentence-builder'],
  ['Story Steps', 'speech-language-story-steps'],
])('records the real %s dashboard flow with measured time and minimal metadata', (title, id) => {
  openTool(title);
  if (id.endsWith('phrase-cards')) phrasePractice();
  else if (id.endsWith('sentence-builder')) {
    click('I'); click('read'); click('at home.'); fireEvent.click(screen.getByRole('checkbox'));
  } else { click('Compare with an example'); fireEvent.click(screen.getByRole('checkbox')); }
  act(() => { jest.advanceTimersByTime(12000); });
  const labels: Record<string, string> = {
    'speech-language-phrase-cards': 'Record phrase practice',
    'speech-language-sentence-builder': 'Record sentence practice',
    'speech-language-story-steps': 'Record story practice',
  };
  click(labels[id]);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  const progress = useChildProgressStore.getState();
  expect(progress.completions).toEqual([
    expect.objectContaining({ activityId: id, neuroId: 'speech-language', starsEarned: 3, durationMinutes: 0.2 }),
  ]);
  expect(progress.starsTotal).toBe(3);
  expect(progress.metricValues).toEqual([expect.objectContaining({ neuroId: 'speech-language', value: 1 })]);
  expect(JSON.stringify(progress.completions)).not.toMatch(/Please show|at home|Sam gives|pointed/);
});

test('guest completion stays in the guest scope and does not bind persistent storage', () => {
  prepareReadyChildScope('guest-child', ['speech-language']);
  useAuthStore.setState({ user: null, session: null, isGuest: true });
  const before = { ...window.localStorage };
  openTool('Helpful Phrase Cards'); phrasePractice(); click('Record phrase practice');
  expect(useChildProgressStore.getState().ownerId).toBe('guest-child');
  expect(useChildProgressStore.getState().completions).toHaveLength(1);
  expect({ ...window.localStorage }).toEqual(before);
});

test('closing or pressing Escape discards unfinished practice and returns focus', () => {
  const launch = openTool('Helpful Phrase Cards'); phrasePractice();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(useChildProgressStore.getState().completions).toHaveLength(0);
  expect(launch).toHaveFocus();
  fireEvent.click(launch);
  expect(screen.getByRole('button', { name: 'Record phrase practice' })).toBeDisabled();
  click('Close activity');
  expect(useChildProgressStore.getState().starsTotal).toBe(0);
});

test('the paused modal excludes hidden practice controls from its focus loop', () => {
  openTool('Helpful Phrase Cards'); phrasePractice(); click('Pause practice');
  const resume = screen.getByRole('button', { name: 'Continue practice' });
  resume.focus(); fireEvent.keyDown(resume, { key: 'Tab' });
  expect(screen.getByRole('button', { name: 'Close activity' })).toHaveFocus();
  fireEvent.keyDown(screen.getByRole('button', { name: 'Close activity' }), { key: 'Tab', shiftKey: true });
  expect(resume).toHaveFocus();
  expect(screen.queryByRole('button', { name: 'Record phrase practice' })).not.toBeInTheDocument();
});

test('switching accounts closes the old activity without awarding another child', () => {
  openTool('Helpful Phrase Cards'); phrasePractice();
  act(() => { prepareReadyChildScope('child-b', ['speech-language']); });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(useChildProgressStore.getState().ownerId).toBe('child-b');
  expect(useChildProgressStore.getState().completions).toHaveLength(0);
});

test('a stale progress owner cannot launch a dashboard practice', () => {
  prepareReadyChildScope('child-a', ['speech-language']);
  useChildProgressStore.setState({ ownerId: 'child-b' });
  render(<MemoryRouter><ChildDashboardPage /></MemoryRouter>);
  fireEvent.click(screen.getByText('More tools and progress'));
  const card = screen.getByRole('heading', { name: 'Helpful Phrase Cards' }).closest('li')!;
  fireEvent.click(within(card).getByRole('button', { name: 'Start activity' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(useChildProgressStore.getState().completions).toHaveLength(0);
});
