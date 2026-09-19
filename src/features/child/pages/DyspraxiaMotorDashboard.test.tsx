import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import { MOVEMENT_CHECKS } from 'features/child/components/dashboard/dyspraxiaMotorContent';
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
  prepareReadyChildScope('child-a', ['dyspraxia']);
});
afterEach(() => { cleanup(); clearReadyChildScope(); jest.useRealTimers(); Reflect.deleteProperty(document, 'hidden'); });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const check = (name: string) => fireEvent.click(screen.getByRole('checkbox', { name }));
const openTool = (title: string) => {
  render(<MemoryRouter><ChildDashboardPage /></MemoryRouter>);
  fireEvent.click(screen.getByText('More tools and progress'));
  const card = screen.getByRole('heading', { name: title }).closest('li');
  if (!card) throw new Error('Missing real motor activity card');
  const launch = within(card).getByRole('button', { name: 'Start activity' });
  launch.focus(); fireEvent.click(launch);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Mark Complete' })).not.toBeInTheDocument();
  return launch;
};
const placement = () => { click('Choose Moon'); click('Place in first space'); check('I explored placing or moving a piece'); };
const cardExploration = (outcome = 'I read or imagined a step') => {
  click('Open selected card'); click('Mark this step explored'); click(outcome); check('I reviewed this card in my own way');
};

test.each([
  ['Fine Motor Mission', 'dyspraxia-fine-motor', 'Record placement practice', 4],
  ['Gross Motor Galaxy', 'dyspraxia-gross-motor', 'Record card exploration', 3],
] as const)('%s uses the real modal, measured duration and separate reporting', (title, id, finish, stars) => {
  openTool(title); if (id === 'dyspraxia-fine-motor') placement(); else cardExploration();
  act(() => { jest.advanceTimersByTime(12000); }); click(finish);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  const state = useChildProgressStore.getState();
  expect(state.completions).toEqual([expect.objectContaining({ activityId: id, neuroId: 'dyspraxia', starsEarned: stars, durationMinutes: 0.2 })]);
  expect(state.starsTotal).toBe(stars); expect(state.metricValues).toEqual([]); expect(state.dyspraxiaPlanningSessions).toEqual([]);
  expect(JSON.stringify(state.completions)).not.toMatch(/Moon|Small wave|positions|readiness|outcome|rest/);
  expect(screen.getByRole('heading', { name: 'Placement and card exploration' })).toBeInTheDocument();
});

test.each(['I read or imagined a step', 'I chose to rest', 'I chose to ask for help'])('%s receives equal real dashboard reward without claiming physical movements', outcome => {
  openTool('Gross Motor Galaxy'); cardExploration(outcome); click('Record card exploration');
  expect(useChildProgressStore.getState().completions[0]).toEqual(expect.objectContaining({ starsEarned: 3, durationMinutes: 0 }));
  expect(screen.getByTestId('motor-card-count')).toHaveTextContent('1'); expect(useChildProgressStore.getState().metricValues).toEqual([]);
});

test.each(['Fine Motor Mission', 'Gross Motor Galaxy'])('%s works in guest scope without new persistent storage', title => {
  prepareReadyChildScope('guest-child', ['dyspraxia']); useAuthStore.setState({ user: null, session: null, isGuest: true });
  const before = { ...localStorage }; openTool(title);
  if (title === 'Fine Motor Mission') { placement(); click('Record placement practice'); }
  else { cardExploration(); click('Record card exploration'); }
  expect(useChildProgressStore.getState().ownerId).toBe('guest-child');
  expect(useChildProgressStore.getState().completions).toHaveLength(1); expect({ ...localStorage }).toEqual(before);
});

test('Escape discards an unrecorded arrangement and restores launcher focus', () => {
  const launch = openTool('Fine Motor Mission'); placement(); fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(useChildProgressStore.getState().completions).toHaveLength(0); expect(launch).toHaveFocus();
  fireEvent.click(launch); expect(screen.getByRole('button', { name: 'Record placement practice' })).toBeDisabled();
  expect(screen.getByTestId('motor-space-0')).toHaveTextContent('Empty space');
});

test('the paused placement modal excludes hidden controls from its focus loop', () => {
  openTool('Fine Motor Mission'); placement(); click('Pause this practice');
  const resume = screen.getByRole('button', { name: 'Continue this practice' });
  resume.focus(); fireEvent.keyDown(resume, { key: 'Tab' }); expect(screen.getByRole('button', { name: 'Close activity' })).toHaveFocus();
  fireEvent.keyDown(screen.getByRole('button', { name: 'Close activity' }), { key: 'Tab', shiftKey: true }); expect(resume).toHaveFocus();
});

test('the movement stop remains accessible inside the paused modal', () => {
  openTool('Gross Motor Galaxy'); click('Try a seated action'); MOVEMENT_CHECKS.forEach(check); click('Open selected card'); click('Pause this practice');
  const stop = screen.getByRole('button', { name: 'Stop — I need rest or help' }); stop.focus();
  fireEvent.keyDown(stop, { key: 'Tab' }); expect(screen.getByRole('button', { name: 'Close activity' })).toHaveFocus();
  fireEvent.click(stop); expect(screen.getByText(/No message or alert has been sent/)).toBeInTheDocument();
  expect(useChildProgressStore.getState().completions).toHaveLength(0);
});

test.each(['Fine Motor Mission', 'Gross Motor Galaxy'])('%s closes on account switch without crediting a different child', title => {
  openTool(title); if (title === 'Fine Motor Mission') placement(); else cardExploration();
  act(() => { prepareReadyChildScope('child-b', ['dyspraxia']); });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(useChildProgressStore.getState().ownerId).toBe('child-b');
  expect(useChildProgressStore.getState().completions).toHaveLength(0);
});

test('a stale progress owner cannot launch the new fine-motor tool', () => {
  useChildProgressStore.setState({ ownerId: 'child-b' }); render(<MemoryRouter><ChildDashboardPage /></MemoryRouter>);
  fireEvent.click(screen.getByText('More tools and progress'));
  const card = screen.getByRole('heading', { name: 'Fine Motor Mission' }).closest('li')!;
  fireEvent.click(within(card).getByRole('button', { name: 'Start activity' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(useChildProgressStore.getState().completions).toHaveLength(0);
});
