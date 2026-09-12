import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { getKnownActivityById } from 'features/child/data/neuroDashboardContent';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import NeuroZoneCard from './NeuroZoneCard';

beforeEach(() => { prepareReadyChildScope('child-a', ['tourettes', 'adhd']); });
afterEach(() => { cleanup(); clearReadyChildScope(); });

test.each(['tourettes-flex-flow', 'tourettes-tic-break'])('completed %s retains its badge and a separate support reuse control', id => {
  const activity = getKnownActivityById(id)!;
  useChildProgressStore.getState().completeActivity(id, 'tourettes', activity.starsReward, 0.1);
  const onStart = jest.fn();
  render(<NeuroZoneCard neuroId="tourettes" activities={[activity]} onStartActivity={onStart} />);
  expect(screen.getByText('Completed!')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Use support tool again' }));
  expect(onStart).toHaveBeenCalledWith(activity);
  expect(useChildProgressStore.getState().completions).toHaveLength(1);
});

test.each(['tourettes-creative-free', 'adhd-focus-coach'])('the completion launch policy for unrelated %s stays unchanged', id => {
  const activity = getKnownActivityById(id)!;
  useChildProgressStore.getState().completeActivity(id, activity.neuroId, activity.starsReward, 0.1);
  render(<NeuroZoneCard neuroId={activity.neuroId} activities={[activity]} onStartActivity={jest.fn()} />);
  expect(screen.getByText('Completed!')).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

test('even a previously completed support tool cannot be reopened when explicitly planned', () => {
  const original = getKnownActivityById('tourettes-tic-break')!;
  useChildProgressStore.getState().completeActivity(original.id, original.neuroId, original.starsReward, 0.1);
  render(<NeuroZoneCard neuroId="tourettes" activities={[{ ...original, availability: 'planned' }]} onStartActivity={jest.fn()} />);
  expect(screen.getByText('Not available yet')).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
