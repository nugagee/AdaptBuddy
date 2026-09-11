import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DysgraphiaWordBankActivity, {
  type DysgraphiaWordBankSessionInput,
} from './DysgraphiaWordBankActivity';

describe('DysgraphiaWordBankActivity', () => {
  it('offers deterministic fixed-vocabulary prompts and gates saving', () => {
    render(<DysgraphiaWordBankActivity onComplete={jest.fn()} />);

    expect(screen.getAllByRole('button', { name: /^Choose .* prompt$/ })).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Choose My school day prompt' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const saveButton = screen.getByRole('button', { name: 'Save sentence practice' });
    expect(saveButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'I practised' }));
    expect(saveButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Add Today' }));
    expect(saveButton).toBeEnabled();
    expect(screen.getByTestId('dysgraphia-built-sentence')).toHaveTextContent('Today');
  });

  it('supports keyboard selection, reordering and removal with large labelled controls', async () => {
    render(<DysgraphiaWordBankActivity onComplete={jest.fn()} />);

    const addToday = screen.getByRole('button', { name: 'Add Today' });
    expect(addToday).toHaveClass('min-h-12');
    addToday.focus();
    await act(async () => { await userEvent.keyboard('{Enter}'); });
    fireEvent.click(screen.getByRole('button', { name: 'Add I' }));

    const moveILeft = screen.getByRole('button', { name: 'Move I left' });
    expect(moveILeft).toHaveClass('min-h-12');
    moveILeft.focus();
    await act(async () => { await userEvent.keyboard('{Enter}'); });
    expect(screen.getByTestId('dysgraphia-built-sentence')).toHaveTextContent('I Today');

    const removeToday = screen.getByRole('button', { name: 'Remove Today' });
    expect(removeToday).toHaveClass('min-h-12');
    fireEvent.click(removeToday);
    expect(screen.getByTestId('dysgraphia-built-sentence')).toHaveTextContent('I');
    expect(screen.getByRole('button', { name: 'Add Today' })).toBeEnabled();
  });

  it('returns the exact neutral structured payload after meaningful practice', () => {
    const onComplete = jest.fn<void, [DysgraphiaWordBankSessionInput]>();
    render(<DysgraphiaWordBankActivity onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose Ask for help prompt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Please' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add help' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add me' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move me left' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check my sentence' }));
    fireEvent.click(screen.getByRole('button', { name: 'I need help' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save sentence practice' }));

    expect(onComplete).toHaveBeenCalledWith({
      sessionId: expect.any(String),
      activityId: 'dysgraphia-word-bank',
      promptId: 'ask-for-help',
      promptTitle: 'Ask for help',
      selectedWordIds: ['please', 'me', 'help'],
      selectedWords: ['Please', 'me', 'help'],
      editsMade: 4,
      checksMade: 1,
      supportsUsed: ['fixed word bank', 'sentence check', 'reorder controls'],
      confidence: 'need-help',
    });
  });

  it('starts a newly selected prompt cleanly without carrying a discarded draft', () => {
    const onComplete = jest.fn<void, [DysgraphiaWordBankSessionInput]>();
    render(<DysgraphiaWordBankActivity onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add Today' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check my sentence' }));
    fireEvent.click(screen.getByRole('button', { name: 'I feel confident' }));

    fireEvent.click(screen.getByRole('button', { name: 'Choose A helpful person prompt' }));
    expect(screen.getByTestId('dysgraphia-built-sentence')).toHaveTextContent(
      'Choose a word card to begin.',
    );
    expect(screen.getByRole('button', { name: 'Save sentence practice' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Add My' }));
    fireEvent.click(screen.getByRole('button', { name: 'I practised' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save sentence practice' }));

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      promptId: 'a-helpful-person',
      selectedWordIds: ['my'],
      selectedWords: ['My'],
      editsMade: 1,
      checksMade: 0,
      supportsUsed: ['fixed word bank'],
      confidence: 'practised',
    }));
  });
});
