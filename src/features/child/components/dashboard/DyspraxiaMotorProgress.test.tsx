import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import DyspraxiaMotorProgress from './DyspraxiaMotorProgress';

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date('2026-09-10T10:00:00Z')); prepareReadyChildScope('child-a', ['dyspraxia']); });
afterEach(() => { cleanup(); clearReadyChildScope(); jest.useRealTimers(); });
const complete = (id = 'dyspraxia-fine-motor', neuroId = 'dyspraxia') => useChildProgressStore.getState().completeActivity(id, neuroId, 3, 0.2);

test('an empty exploration summary makes no claim of physical practice', () => {
  render(<DyspraxiaMotorProgress />); expect(screen.queryByRole('region')).not.toBeInTheDocument();
});

test('separate counts come from the two recorded activity identifiers', () => {
  complete(); complete('dyspraxia-gross-motor'); render(<DyspraxiaMotorProgress />);
  expect(screen.getByTestId('motor-placement-count')).toHaveTextContent('1');
  expect(screen.getByTestId('motor-card-count')).toHaveTextContent('1');
  expect(screen.getByText(/not movements performed, coordination scores or completed step plans/)).toBeInTheDocument();
});

test.each(['owner', 'loading', 'account'])('%s mismatch prevents another session\'s progress being shown', mismatch => {
  complete();
  if (mismatch === 'owner') useChildProgressStore.setState({ ownerId: 'child-b' });
  if (mismatch === 'loading') useChildProgressStore.setState({ hydrationStatus: 'loading' });
  if (mismatch === 'account') useAuthStore.setState({ user: { ...useAuthStore.getState().user!, id: 'child-b' } });
  render(<DyspraxiaMotorProgress />); expect(screen.queryByRole('region')).not.toBeInTheDocument();
});

test('previous-day and unrelated-profile completions are not shown as today\'s motor practice', () => {
  jest.setSystemTime(new Date('2026-09-09T10:00:00Z')); complete();
  jest.setSystemTime(new Date('2026-09-10T10:00:00Z')); complete('dyspraxia-gross-motor', 'adhd'); complete('dyspraxia-sequence-steps');
  render(<DyspraxiaMotorProgress />); expect(screen.queryByRole('region')).not.toBeInTheDocument();
});

test('motor explorations do not change step-plan metrics or structured planner results', () => {
  const metric = { neuroId: 'dyspraxia', value: 2, date: '2026-09-10' };
  useChildProgressStore.setState({ metricValues: [metric] }); complete(); complete('dyspraxia-gross-motor');
  const state = useChildProgressStore.getState();
  expect(state.metricValues).toEqual([metric]); expect(state.dyspraxiaPlanningSessions).toEqual([]);
  expect(state.completions).toHaveLength(2);
});

test('same-day repeated completion cannot inflate stars or the exploration count', () => {
  complete(); complete(); render(<DyspraxiaMotorProgress />);
  expect(screen.getByTestId('motor-placement-count')).toHaveTextContent('1');
  expect(useChildProgressStore.getState().starsTotal).toBe(3);
});

test('unrelated non-structured profile metrics still increment normally', () => {
  complete('visual-font-lab', 'visual-stress');
  expect(useChildProgressStore.getState().metricValues).toEqual([{ neuroId: 'visual-stress', value: 1, date: '2026-09-10' }]);
});
