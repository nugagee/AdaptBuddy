import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import { emitSpeechEvent, installAuditorySpeechMock } from 'testUtils/auditorySpeechMock';
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

let speech: ReturnType<typeof installAuditorySpeechMock>;
beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-09-11T09:00:00Z'));
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  prepareReadyChildScope('child-a', ['auditory']); speech = installAuditorySpeechMock();
});
afterEach(() => { cleanup(); clearReadyChildScope(); speech.restore(); jest.useRealTimers(); Reflect.deleteProperty(document, 'hidden'); });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const openTool = (title = 'Caption Match Game') => {
  render(<MemoryRouter><ChildDashboardPage /></MemoryRouter>);
  fireEvent.click(screen.getByText('More tools and progress'));
  const card = screen.getByRole('heading', { name: title }).closest('li');
  if (!card) throw new Error('Missing real auditory card');
  const launch = within(card).getByRole('button', { name: 'Start activity' });
  launch.focus(); fireEvent.click(launch);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Mark Complete' })).not.toBeInTheDocument();
  return launch;
};
const readyCaption = (label = 'A cat sleeping on a mat') => {
  click(label); click('Check my match'); fireEvent.click(screen.getByRole('checkbox', { name: 'I compared my card with the caption' }));
};

test.each(['A cat sleeping on a mat', 'A dog running by a tree'])('caption review of %s records equal practice rewards without correctness data', label => {
  openTool(); readyCaption(label); act(() => { jest.advanceTimersByTime(12000); }); click('Record caption practice');
  const progress = useChildProgressStore.getState();
  expect(progress.completions).toEqual([expect.objectContaining({ activityId: 'auditory-caption-match', neuroId: 'auditory', starsEarned: 4, durationMinutes: 0.2 })]);
  expect(progress.metricValues).toEqual([expect.objectContaining({ neuroId: 'auditory', value: 1 })]);
  expect(progress.starsTotal).toBe(4); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(JSON.stringify(progress.completions)).not.toMatch(/correct|voice|captionText|choice|heard/);
});

test('one explored instruction records honest partial practice through the actual modal', () => {
  openTool('Slow & Clear Mode'); click('I explored this instruction'); fireEvent.click(screen.getByRole('checkbox'));
  act(() => { jest.advanceTimersByTime(6000); }); click('Record instruction practice');
  expect(useChildProgressStore.getState().completions).toEqual([expect.objectContaining({ activityId: 'auditory-slow-speech', starsEarned: 3, durationMinutes: 0.1 })]);
  expect(speech.synth.speak).not.toHaveBeenCalled();
});

test('guest text-only completion creates no new persistent choice or voice storage', () => {
  prepareReadyChildScope('guest-child', ['auditory']); useAuthStore.setState({ user: null, isGuest: true });
  speech.synth.getVoices.mockReturnValue([]); const before = { ...localStorage };
  openTool(); readyCaption(); click('Record caption practice');
  expect(useChildProgressStore.getState().ownerId).toBe('guest-child'); expect(useChildProgressStore.getState().completions).toHaveLength(1);
  expect({ ...localStorage }).toEqual(before);
});

test('Escape cancels audio, discards choices, restores focus and does not award completion', () => {
  const launch = openTool(); readyCaption(); click('Play caption');
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(speech.synth.cancel).toHaveBeenCalledTimes(1); expect(useChildProgressStore.getState().completions).toHaveLength(0); expect(launch).toHaveFocus();
  fireEvent.click(launch); expect(screen.getByRole('checkbox')).toBeDisabled();
});

test('audio completion alone is not activity completion', () => {
  openTool(); click('Play caption'); act(() => { emitSpeechEvent(speech.utterance(), 'onend'); });
  expect(useChildProgressStore.getState().completions).toHaveLength(0); expect(useChildProgressStore.getState().starsTotal).toBe(0);
});

test('paused modal focus loop excludes hidden activity controls and cannot restart audio', () => {
  openTool(); click('Play caption'); click('Pause communication practice');
  const resume = screen.getByRole('button', { name: 'Continue communication practice' });
  resume.focus(); fireEvent.keyDown(resume, { key: 'Tab' }); expect(screen.getByRole('button', { name: 'Close activity' })).toHaveFocus();
  expect(screen.queryByRole('button', { name: 'Play caption' })).not.toBeInTheDocument(); expect(speech.synth.speak).toHaveBeenCalledTimes(1);
});

test('account changes close the old modal and cancel narration without crediting the new child', () => {
  openTool(); readyCaption(); click('Play caption');
  act(() => { prepareReadyChildScope('child-b', ['auditory']); });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(speech.synth.cancel).toHaveBeenCalledTimes(1);
  expect(useChildProgressStore.getState().completions).toHaveLength(0);
});

test('stale progress ownership blocks the actual card from launching', () => {
  useChildProgressStore.setState({ ownerId: 'child-b' });
  render(<MemoryRouter><ChildDashboardPage /></MemoryRouter>); fireEvent.click(screen.getByText('More tools and progress'));
  const card = screen.getByRole('heading', { name: 'Caption Match Game' }).closest('li')!;
  fireEvent.click(within(card).getByRole('button', { name: 'Start activity' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(speech.synth.speak).not.toHaveBeenCalled();
});
