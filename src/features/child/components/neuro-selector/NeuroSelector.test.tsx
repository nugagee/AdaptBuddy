import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import NeuroSelector from './NeuroSelector';

jest.mock('constants/neuroOptions', () => ({
  ACTIVE_NEURO_IDS: new Set(['autism', 'dyslexia']),
  NEURO_OPTIONS: [
    {
      id: 'autism',
      name: 'Autism support',
      learningStyle: 'Visual support',
      description: 'Predictable routines and clear choices.',
      longDescription: 'Choose visual supports.',
      icon: () => <span aria-hidden>visual</span>,
    },
    {
      id: 'dyslexia',
      name: 'Dyslexia support',
      learningStyle: 'Reading support',
      description: 'Reading choices and clear spacing.',
      longDescription: 'Choose reading supports.',
      icon: () => <span aria-hidden>reading</span>,
    },
    {
      id: 'speech-language',
      name: 'Speech and language support',
      learningStyle: 'Communication support',
      description: 'Coming soon.',
      longDescription: 'Coming soon.',
      icon: () => <span aria-hidden>speech</span>,
    },
  ],
}));

jest.mock('store/uiStore', () => ({
  useUiStore: (selector: (state: { reducedMotion: boolean }) => unknown) => selector({ reducedMotion: false }),
}));

jest.mock('assets/Adaptbuddy_logo.png', () => 'adaptbuddy-logo.png');

describe('NeuroSelector', () => {
  it('starts without an assumed support profile and requires an affirmative choice', () => {
    const onContinue = jest.fn();
    render(<NeuroSelector onContinue={onContinue} />);

    expect(screen.getByLabelText('0 selected')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /autism support/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('button', { name: 'Create My Calm Space' })).toBeDisabled();
    expect(screen.getByText(/support choices, not a diagnosis/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /autism support/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Create My Calm Space' }));
    expect(onContinue).toHaveBeenCalledWith(['autism']);
  });

  it('does not turn an unavailable saved value into an Autism selection', () => {
    render(<NeuroSelector initialSelected={['speech-language']} onContinue={jest.fn()} />);

    expect(screen.getByLabelText('0 selected')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /autism support/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('checkbox', { name: /speech and language support/i })).toBeDisabled();
  });
});
