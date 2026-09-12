import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { SensoryComfortSessionInput } from 'features/child/store/childProgressStore';
import SensoryComfortCheckInActivity from './SensoryComfortCheckInActivity';

const completeFourChoices = () => {
  fireEvent.click(screen.getAllByRole('button', { name: 'Comfortable' })[0]);
  fireEvent.click(screen.getAllByRole('button', { name: 'A bit much' })[1]);
  fireEvent.click(screen.getAllByRole('button', { name: 'I want a change' })[2]);
  fireEvent.click(screen.getAllByRole('button', { name: 'Comfortable' })[3]);
};

describe('SensoryComfortCheckInActivity', () => {
  it('frames the activity as a child-led check-in with no score or assessment claim', () => {
    render(<SensoryComfortCheckInActivity onComplete={jest.fn()} />);

    expect(screen.getByText(/there are no right answers and no score/i)).toBeInTheDocument();
    expect(screen.getByText(/comfort check-in, not a test/i)).toBeInTheDocument();
    expect(screen.getByText('0 of 4 choices made')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save my comfort choice' })).toBeDisabled();
  });

  it('requires all four areas, one support, and a next-step choice before saving', () => {
    render(<SensoryComfortCheckInActivity onComplete={jest.fn()} />);

    completeFourChoices();
    expect(screen.getByText('4 of 4 choices made')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save my comfort choice' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /change a texture or touch/i }));
    expect(screen.getByRole('button', { name: 'Save my comfort choice' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'I need more time' }));
    expect(screen.getByRole('button', { name: 'Save my comfort choice' })).toBeEnabled();
  });

  it('returns only fixed choices in the structured payload', () => {
    const onComplete = jest.fn<void, [SensoryComfortSessionInput]>();
    render(<SensoryComfortCheckInActivity onComplete={onComplete} />);

    completeFourChoices();
    fireEvent.click(screen.getByRole('button', { name: /change a texture or touch/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Ready to continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save my comfort choice' }));

    expect(onComplete).toHaveBeenCalledWith({
      sessionId: expect.any(String),
      activityId: 'spd-sensory-checklist',
      selections: [
        { area: 'sight', comfort: 'comfortable' },
        { area: 'sound', comfort: 'a-bit-much' },
        { area: 'touch', comfort: 'need-change' },
        { area: 'movement', comfort: 'comfortable' },
      ],
      supportChoiceId: 'touch-choice',
      supportChoiceLabel: 'Change a texture or touch',
      supportsUsed: ['sensory choice cards', 'child-chosen comfort support'],
      confidence: 'ready-to-continue',
    });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('is explicit that asking for help does not send a message', () => {
    render(<SensoryComfortCheckInActivity onComplete={jest.fn()} />);

    completeFourChoices();
    fireEvent.click(screen.getByRole('button', { name: /change a texture or touch/i }));
    fireEvent.click(screen.getByRole('button', { name: 'I want help choosing' }));

    expect(screen.getByText(/saving this check-in does not send them a message/i)).toBeInTheDocument();
  });
});
