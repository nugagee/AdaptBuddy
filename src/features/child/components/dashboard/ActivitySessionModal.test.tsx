import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { NEURO_ACTIVITIES } from 'features/child/data/neuroDashboardContent';
import ActivitySessionModal, { type ActivitySessionResult } from './ActivitySessionModal';

const getActivity = (activityId: string) => {
  const activity = NEURO_ACTIVITIES.find((candidate) => candidate.id === activityId);
  if (!activity) throw new Error(`Missing test activity: ${activityId}`);
  return activity;
};

const completeActivity = (activityId: string, onComplete: jest.Mock) => {
  render(
    <ActivitySessionModal
      activity={getActivity(activityId)}
      onClose={jest.fn()}
      onComplete={onComplete}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: /mark complete/i }));
};

describe('ActivitySessionModal ADHD results', () => {
  it('returns the selected Focus Coach state and rescue plan', () => {
    const onComplete = jest.fn<void, [ActivitySessionResult?]>();
    render(
      <ActivitySessionModal
        activity={getActivity('adhd-focus-coach')}
        onClose={jest.fn()}
        onComplete={onComplete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Overloaded' }));
    fireEvent.click(screen.getByRole('button', { name: 'do not know where to start' }));
    fireEvent.click(screen.getByRole('button', { name: /mark complete/i }));

    expect(onComplete).toHaveBeenCalledWith({
      adhdSupportSignal: expect.objectContaining({
        energyId: 'overloaded',
        energyLabel: 'Overloaded',
        rescueReason: 'do not know where to start',
        supportPlan: expect.stringContaining('Lower the demand'),
      }),
    });
  });

  it('returns a task title and generated tiny steps from Task Breakdown Buddy', () => {
    const onComplete = jest.fn<void, [ActivitySessionResult?]>();
    render(
      <ActivitySessionModal
        activity={getActivity('adhd-task-breakdown')}
        onClose={jest.fn()}
        onComplete={onComplete}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Type the task here'), {
      target: { value: 'Read chapter 2' },
    });
    fireEvent.click(screen.getByRole('button', { name: /mark complete/i }));

    expect(onComplete).toHaveBeenCalledWith({
      adhdSupportSignal: expect.objectContaining({
        energyId: 'task-breakdown',
        taskTitle: 'Read chapter 2',
        firstStep: 'Read the heading and first two lines.',
        breakdownSteps: [
          'Read the heading and first two lines.',
          'Point to one important word.',
          'Read one small section.',
          'Say or write one thing you remember.',
        ],
      }),
    });
  });

  it('returns a regulation plan from Break Prescription', () => {
    const onComplete = jest.fn<void, [ActivitySessionResult?]>();
    render(
      <ActivitySessionModal
        activity={getActivity('adhd-break-prescription')}
        onClose={jest.fn()}
        onComplete={onComplete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /overwhelmed quiet reset/i }));
    fireEvent.click(screen.getByRole('button', { name: /mark complete/i }));

    expect(onComplete).toHaveBeenCalledWith({
      adhdSupportSignal: expect.objectContaining({
        energyId: 'overwhelmed',
        energyLabel: 'Overwhelmed',
        rescueReason: 'quiet reset',
        taskTitle: 'Quiet reset break',
        firstStep: 'Return with one instruction visible.',
      }),
    });
  });

  it('hands a completed Movement Burst signal back to the dashboard', () => {
    const onComplete = jest.fn<void, [ActivitySessionResult?]>();
    render(
      <ActivitySessionModal
        activity={getActivity('adhd-movement-burst')}
        onClose={jest.fn()}
        onComplete={onComplete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /^stuck/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Start 60-second burst' }));
    fireEvent.click(screen.getByRole('button', { name: "I'm ready to return" }));
    fireEvent.click(screen.getByRole('button', { name: 'Save reset and return' }));

    expect(onComplete).toHaveBeenCalledWith({
      adhdSupportSignal: expect.objectContaining({
        energyId: 'stuck',
        energyLabel: 'Stuck',
        rescueReason: 'movement reset',
        taskTitle: 'Movement Burst break',
      }),
    });
  });

  it('hands an unlocked Quest Chain badge back to the dashboard', () => {
    const onComplete = jest.fn<void, [ActivitySessionResult?]>();
    render(
      <ActivitySessionModal
        activity={getActivity('adhd-quest-chain')}
        onClose={jest.fn()}
        onComplete={onComplete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Complete win 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Complete win 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Complete win 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save badge and finish' }));

    expect(onComplete).toHaveBeenCalledWith({
      achievementBadge: {
        id: 'adhd-chain-builder',
        title: 'Chain Builder',
        description: 'Completed three tiny wins in a row.',
        emoji: '🔗',
      },
    });
  });

  it('hands an Energy Check-In pacing plan and support signal back to the dashboard', () => {
    const onComplete = jest.fn<void, [ActivitySessionResult?]>();
    render(
      <ActivitySessionModal
        activity={getActivity('adhd-mood-check')}
        onClose={jest.fn()}
        onComplete={onComplete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /^low battery/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Use this pacing plan' }));

    expect(onComplete).toHaveBeenCalledWith({
      adhdEnergyPacing: expect.objectContaining({
        energyId: 'low',
        taskMinutes: 5,
        breakMinutes: 3,
      }),
      adhdSupportSignal: expect.objectContaining({
        energyId: 'low',
        energyLabel: 'Low battery',
        rescueReason: 'energy check-in',
      }),
    });
  });

  it('does not invent a support signal for a generic activity', () => {
    const onComplete = jest.fn<void, [ActivitySessionResult?]>();
    completeActivity('dyslexia-read-aloud', onComplete);
    expect(onComplete).toHaveBeenCalledWith();
  });
});
