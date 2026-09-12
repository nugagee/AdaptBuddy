import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import DyscalculiaPracticeProgress from './DyscalculiaPracticeProgress';

beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-09-10T10:00:00Z'));
  prepareReadyChildScope('child-a', ['dyscalculia']);
});
afterEach(() => { cleanup(); clearReadyChildScope(); jest.useRealTimers(); });
const record = () => {
  useChildProgressStore.getState().completeActivity('dyscalculia-pattern-blocks', 'dyscalculia', 3, 0.2);
  useChildProgressStore.getState().completeActivity('dyscalculia-real-world', 'dyscalculia', 5, 0.3);
};

test('new practices do not fabricate correctness data and preserve an existing Number Line metric', () => {
  const existing = [{ neuroId: 'dyscalculia', value: 7, date: '2026-09-10' }];
  useChildProgressStore.setState({ metricValues: existing }); record();
  expect(useChildProgressStore.getState().metricValues).toEqual(existing);
  expect(useChildProgressStore.getState().dyscalculiaSessions).toEqual([]);
  expect(useChildProgressStore.getState().starsTotal).toBe(8);
});

test('reviewed practice appears separately without duplicating a same-day completion', () => {
  record(); record(); render(<DyscalculiaPracticeProgress />);
  expect(screen.getByText('Pattern practices: 1')).toBeInTheDocument();
  expect(screen.getByText('Story practices: 1')).toBeInTheDocument();
  expect(useChildProgressStore.getState().completions).toHaveLength(2);
  expect(useChildProgressStore.getState().metricValues).toEqual([]);
});

test('previous days and unrelated activities do not enter today\'s practice summary', () => {
  record();
  jest.setSystemTime(new Date('2026-09-11T10:00:00Z'));
  useChildProgressStore.getState().completeActivity('adhd-focus-sprint', 'adhd', 5, 1);
  render(<DyscalculiaPracticeProgress />);
  expect(screen.getByText('Your reviewed pattern and story exercises will appear here.')).toBeInTheDocument();
  expect(screen.queryByText('Pattern practices: 1')).not.toBeInTheDocument();
});

test.each(['owner', 'loading'])('%s mismatch conceals practice history', mode => {
  record(); render(<DyscalculiaPracticeProgress />);
  expect(screen.getByText('Story practices: 1')).toBeInTheDocument();
  act(() => { useChildProgressStore.setState(mode === 'owner' ? { ownerId: 'child-b' } : { hydrationStatus: 'loading' }); });
  expect(screen.queryByText('Story practices: 1')).not.toBeInTheDocument();
});

test('switching accounts removes the previous child\'s summary', () => {
  record(); render(<DyscalculiaPracticeProgress />);
  act(() => { prepareReadyChildScope('child-b', ['dyscalculia']); });
  expect(screen.queryByText('Pattern practices: 1')).not.toBeInTheDocument();
});
