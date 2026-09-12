import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { DyscalculiaSessionInput } from 'features/child/store/childProgressStore';
import DyscalculiaNumberLineActivity from './DyscalculiaNumberLineActivity';

describe('DyscalculiaNumberLineActivity', () => {
  it('requires a checked answer before saving meaningful partial practice', () => {
    const onComplete = jest.fn<void, [DyscalculiaSessionInput]>();
    render(<DyscalculiaNumberLineActivity onComplete={onComplete} />);

    const saveButton = screen.getByRole('button', { name: 'Save practice' });
    expect(saveButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /choose 6 as answer/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));

    expect(screen.getByRole('status')).toHaveTextContent(/not quite right yet/i);
    expect(saveButton).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'I practised' }));
    expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);

    expect(onComplete).toHaveBeenCalledWith({
      sessionId: expect.any(String),
      activityId: 'dyscalculia-number-line',
      questionsAttempted: 1,
      questionsCorrect: 0,
      hintsUsed: 0,
      numberRange: { min: 0, max: 20 },
      operations: ['addition'],
      supportsUsed: ['visual number line', 'counters'],
      confidence: 'practised',
    });
  });

  it('allows a neutral retry without inflating the attempted-question count', () => {
    const onComplete = jest.fn<void, [DyscalculiaSessionInput]>();
    render(<DyscalculiaNumberLineActivity onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: /choose 6 as answer/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    fireEvent.click(screen.getByRole('button', { name: /choose 7 as answer/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));

    expect(screen.getByRole('status')).toHaveTextContent(/lands on 7/i);

    fireEvent.click(screen.getByRole('button', { name: 'I practised' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save practice' }));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        questionsAttempted: 1,
        questionsCorrect: 1,
      }),
    );
  });

  it('records addition, subtraction, hint use and selected confidence', () => {
    const onComplete = jest.fn<void, [DyscalculiaSessionInput]>();
    render(<DyscalculiaNumberLineActivity onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Show a hint' }));
    expect(screen.getByText(/start at 4\. move right 3 spaces/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /choose 7 as answer/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Try next question' }));

    expect(screen.getByRole('heading', { name: '12 − 5 = ?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /choose 7 as answer/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    fireEvent.click(screen.getByRole('button', { name: 'I feel confident' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save practice' }));

    expect(onComplete).toHaveBeenCalledWith({
      sessionId: expect.any(String),
      activityId: 'dyscalculia-number-line',
      questionsAttempted: 2,
      questionsCorrect: 2,
      hintsUsed: 1,
      numberRange: { min: 0, max: 20 },
      operations: ['addition', 'subtraction'],
      supportsUsed: ['visual number line', 'counters', 'step hint'],
      confidence: 'confident',
    });
  });
});
