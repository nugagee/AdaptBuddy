import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type {
  AdhdEnergyPacingInput,
  AdhdSupportSignalInput,
} from 'features/child/store/childProgressStore';
import AdhdEnergyCheckInActivity from './AdhdEnergyCheckInActivity';

describe('AdhdEnergyCheckInActivity', () => {
  it('starts with a neutral ready plan and explains that every level is valid', () => {
    render(<AdhdEnergyCheckInActivity onComplete={jest.fn()} />);

    expect(screen.getByText(/there is no good or bad level/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^ready/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('10 min on')).toBeInTheDocument();
    expect(screen.getByText('2 min off')).toBeInTheDocument();
  });

  it('returns an urgent-friendly pacing plan and support signal for overload', () => {
    const onComplete = jest.fn<
      void,
      [AdhdEnergyPacingInput, AdhdSupportSignalInput]
    >();
    render(<AdhdEnergyCheckInActivity onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: /^overloaded/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Use this pacing plan' }));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        energyId: 'overloaded',
        energyLabel: 'Overloaded',
        taskMinutes: 3,
        breakMinutes: 5,
        recommendationMood: 'anxious',
      }),
      expect.objectContaining({
        energyId: 'overloaded',
        energyLabel: 'Overloaded',
        rescueReason: 'overloaded',
        firstStep: expect.stringContaining('one clear instruction'),
        supportPlan: expect.stringContaining('3 minutes on, 5 minutes off'),
      }),
    );
  });
});
