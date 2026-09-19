import React, { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { AdhdSupportSignalInput } from 'features/child/store/childProgressStore';
import AdhdMovementBurstActivity from './AdhdMovementBurstActivity';

describe('AdhdMovementBurstActivity', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs a pausable 60-second state-matched movement sequence', () => {
    const onComplete = jest.fn<void, [AdhdSupportSignalInput]>();
    render(<AdhdMovementBurstActivity onComplete={onComplete} />);

    expect(screen.getByText('March to a beat')).toBeInTheDocument();
    expect(screen.getByText('Standing')).toBeInTheDocument();
    expect(screen.getByText('Seated option')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('1:00');

    fireEvent.click(screen.getByRole('button', { name: /^sleepy/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Start 60-second burst' }));

    act(() => {
      jest.advanceTimersByTime(15_000);
    });
    expect(screen.getByText('Step side to side')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('0:45');

    fireEvent.click(screen.getByRole('button', { name: 'Pause movement' }));
    act(() => {
      jest.advanceTimersByTime(5_000);
    });
    expect(screen.getByRole('timer')).toHaveTextContent('0:45');

    fireEvent.click(screen.getByRole('button', { name: 'Resume movement' }));
    act(() => {
      jest.advanceTimersByTime(45_000);
    });

    expect(screen.getByText('Reset complete')).toBeInTheDocument();
    expect(screen.getByText('One clear return step')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('0:00');

    fireEvent.click(screen.getByRole('button', { name: 'Save reset and return' }));

    expect(onComplete).toHaveBeenCalledWith({
      energyId: 'sleepy',
      energyLabel: 'Sleepy',
      firstStep: 'Choose a three-minute start and begin with the easiest visible action.',
      rescueReason: 'movement reset',
      supportPlan: expect.stringContaining('Use the seated version'),
      taskTitle: 'Movement Burst break',
      breakdownSteps: expect.arrayContaining([
        expect.stringContaining('Reach tall'),
        expect.stringContaining('Seated option'),
      ]),
    });
  });

  it('allows a child to finish early and still records partial movement', () => {
    const onComplete = jest.fn<void, [AdhdSupportSignalInput]>();
    render(<AdhdMovementBurstActivity onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: /^stuck/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Start 60-second burst' }));
    fireEvent.click(screen.getByRole('button', { name: "I'm ready to return" }));
    fireEvent.click(screen.getByRole('button', { name: 'Save reset and return' }));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        energyId: 'stuck',
        energyLabel: 'Stuck',
        firstStep: 'Ask for one example or do only the smallest part of the task.',
      }),
    );
  });

  it('can reset the timer and choose a different body state', () => {
    render(<AdhdMovementBurstActivity onComplete={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Start 60-second burst' }));
    act(() => {
      jest.advanceTimersByTime(7_000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByRole('timer')).toHaveTextContent('1:00');
    expect(screen.getByRole('button', { name: /^sleepy/i })).toBeEnabled();
    expect(screen.queryByRole('button', { name: "I'm ready to return" })).not.toBeInTheDocument();
  });
});
