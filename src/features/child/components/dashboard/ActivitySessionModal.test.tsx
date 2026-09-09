import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { NEURO_ACTIVITIES } from 'features/child/data/neuroDashboardContent';
import ActivitySessionModal, { type ActivitySessionResult } from './ActivitySessionModal';

jest.mock('features/child/store/childProgressReadAccess', () => ({
  useChildProgressReadAccess: () => ({ childId: 'test-child', isReady: true }),
}));

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

  it('hands partial Read-Aloud Adventure progress back to the dashboard', () => {
    const onComplete = jest.fn<void, [ActivitySessionResult?]>();
    render(
      <ActivitySessionModal
        activity={getActivity('dyslexia-read-aloud')}
        onClose={jest.fn()}
        onComplete={onComplete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mark sentence complete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save partial reading' }));

    expect(onComplete).toHaveBeenCalledWith({
      dyslexiaReadingSession: expect.objectContaining({
        passageId: 'moon-garden',
        sentencesCompleted: 1,
        totalSentences: 4,
        wordsRead: 7,
      }),
    });
  });

  it('hands Colored Overlay Reader progress and preferences back to the dashboard', async () => {
    const onComplete = jest.fn<void, [ActivitySessionResult?]>();
    render(
      <ActivitySessionModal
        activity={getActivity('dyslexia-overlay-read')}
        onClose={jest.fn()}
        onComplete={onComplete}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Blue' }));
    fireEvent.click(screen.getByRole('button', { name: 'I read this line' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save partial overlay reading' }));

    expect(onComplete).toHaveBeenCalledWith({
      dyslexiaReadingSession: expect.objectContaining({
        activityId: 'dyslexia-overlay-read',
        passageId: 'moon-garden',
        sentencesCompleted: 1,
        wordsRead: 7,
      }),
      dyslexiaReaderPreferences: expect.objectContaining({
        overlay: 'blue',
        readingRuler: true,
      }),
    });
  });

  it('hands Phonics Trace & Say practice back to the dashboard', () => {
    const onComplete = jest.fn<void, [ActivitySessionResult?]>();
    render(
      <ActivitySessionModal
        activity={getActivity('dyslexia-phonics-trace')}
        onClose={jest.fn()}
        onComplete={onComplete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hear mmm' }));
    fireEvent.click(screen.getByRole('button', { name: 'My trace is ready' }));
    fireEvent.click(screen.getByRole('button', { name: 'I said mmm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Complete m mission' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save phonics practice' }));

    expect(onComplete).toHaveBeenCalledWith({
      dyslexiaPhonicsSession: expect.objectContaining({
        completedSoundIds: ['m-moon'],
        completedSounds: ['mmm'],
        wordsPractised: ['moon'],
        totalSounds: 4,
      }),
    });
  });

  it('hands meaningful Number Line practice back to the dashboard without a bypass button', () => {
    const onComplete = jest.fn<void, [ActivitySessionResult?]>();
    render(
      <ActivitySessionModal
        activity={getActivity('dyscalculia-number-line')}
        onClose={jest.fn()}
        onComplete={onComplete}
      />,
    );

    expect(screen.queryByRole('button', { name: /mark complete/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /choose 7 as answer/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    fireEvent.click(screen.getByRole('button', { name: 'I practised' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save practice' }));

    expect(onComplete).toHaveBeenCalledWith({
      dyscalculiaSession: expect.objectContaining({
        activityId: 'dyscalculia-number-line',
        sessionId: expect.any(String),
        questionsAttempted: 1,
        questionsCorrect: 1,
      }),
    });
  });

  it('hands a checked Step Planner draft back without a generic completion bypass', () => {
    const onComplete = jest.fn<void, [ActivitySessionResult?]>();
    render(
      <ActivitySessionModal
        activity={getActivity('dyspraxia-sequence-steps')}
        onClose={jest.fn()}
        onComplete={onComplete}
      />,
    );

    expect(screen.queryByRole('button', { name: /mark complete/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Check my order' }));
    fireEvent.click(screen.getByRole('button', { name: 'I have practised' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save this plan' }));

    expect(onComplete).toHaveBeenCalledWith({
      dyspraxiaPlanningSession: expect.objectContaining({
        activityId: 'dyspraxia-sequence-steps',
        sessionId: expect.any(String),
        checksMade: 1,
        confidence: 'practised',
      }),
    });
  });

  it('hands Word Bank Express practice back without a generic completion bypass', () => {
    const onComplete = jest.fn<void, [ActivitySessionResult?]>();
    render(
      <ActivitySessionModal
        activity={getActivity('dysgraphia-word-bank')}
        onClose={jest.fn()}
        onComplete={onComplete}
      />,
    );

    expect(screen.queryByRole('button', { name: /mark complete/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add Today' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add I' }));
    fireEvent.click(screen.getByRole('button', { name: 'I practised' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save sentence practice' }));

    expect(onComplete).toHaveBeenCalledWith({
      dysgraphiaWordBankSession: expect.objectContaining({
        activityId: 'dysgraphia-word-bank',
        sessionId: expect.any(String),
        selectedWordIds: ['today', 'i'],
        confidence: 'practised',
      }),
    });
  });

  it('hands a child-led sensory choice back without a generic completion bypass', () => {
    const onComplete = jest.fn<void, [ActivitySessionResult?]>();
    render(
      <ActivitySessionModal
        activity={getActivity('spd-sensory-checklist')}
        onClose={jest.fn()}
        onComplete={onComplete}
      />,
    );

    expect(screen.queryByRole('button', { name: /mark complete/i })).not.toBeInTheDocument();
    ['Light and things I see', 'Sounds', 'Touch and textures', 'Movement'].forEach((areaName) => {
      fireEvent.click(within(screen.getByRole('group', { name: areaName })).getByRole('button', {
        name: 'Comfortable',
      }));
    });
    fireEvent.click(screen.getByRole('button', { name: /keep things as they are/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Ready to continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save my comfort choice' }));

    expect(onComplete).toHaveBeenCalledWith({
      sensoryComfortSession: expect.objectContaining({
        activityId: 'spd-sensory-checklist',
        sessionId: expect.any(String),
        supportChoiceId: 'keep-going',
        confidence: 'ready-to-continue',
      }),
    });
  });

  it('closes the accessible dialog with Escape', () => {
    const onClose = jest.fn();
    render(
      <ActivitySessionModal
        activity={getActivity('dyscalculia-number-line')}
        onClose={onClose}
        onComplete={jest.fn()}
      />,
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
