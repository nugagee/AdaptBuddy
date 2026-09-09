import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DyspraxiaStepPlannerActivity, {
  type DyspraxiaPlanningSessionInput,
} from './DyspraxiaStepPlannerActivity';

const getVisibleSteps = () => (
  screen.getAllByTestId('dyspraxia-plan-step').map((step) => step.textContent)
);

describe('DyspraxiaStepPlannerActivity', () => {
  it('offers three task templates in a deterministic shuffled order and gates saving', () => {
    render(<DyspraxiaStepPlannerActivity onComplete={jest.fn()} />);

    expect(screen.getAllByRole('button', { name: /^Choose .* plan$/ })).toHaveLength(3);
    expect(getVisibleSteps()).toEqual([
      'Pack the things I need',
      'Put on my shoes and coat',
      'Put on my clothes',
    ]);
    expect(screen.getByRole('button', { name: 'Save this plan' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'I have practised' }));
    expect(screen.getByRole('button', { name: 'Save this plan' })).toBeDisabled();
  });

  it('moves cards by keyboard with large labelled buttons and can undo the last move', () => {
    render(<DyspraxiaStepPlannerActivity onComplete={jest.fn()} />);

    const moveButton = screen.getByRole('button', { name: 'Move Pack the things I need down' });
    expect(moveButton).toHaveClass('min-h-12');
    moveButton.focus();
    userEvent.keyboard('{Enter}');

    expect(getVisibleSteps()).toEqual([
      'Put on my shoes and coat',
      'Pack the things I need',
      'Put on my clothes',
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Undo last move' }));
    expect(getVisibleSteps()).toEqual([
      'Pack the things I need',
      'Put on my shoes and coat',
      'Put on my clothes',
    ]);
    expect(screen.getByText('Last move undone. You can try another order or check this one.')).toBeInTheDocument();
  });

  it('starts the third template cleanly without carrying supports from a discarded plan', () => {
    const onComplete = jest.fn<void, [DyspraxiaPlanningSessionInput]>();
    render(<DyspraxiaStepPlannerActivity onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Turn on one-step mode' }));
    fireEvent.click(screen.getByRole('button', { name: 'Turn off one-step mode' }));
    fireEvent.click(screen.getByRole('button', { name: 'Choose Make a snack plan' }));

    expect(screen.getByRole('button', { name: 'Turn on one-step mode' })).toHaveAttribute('aria-pressed', 'false');
    expect(getVisibleSteps()).toEqual([
      'Make or choose my snack',
      'Wash and dry my hands',
      'Put things away',
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Check my order' }));
    fireEvent.click(screen.getByRole('button', { name: 'I have practised' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save this plan' }));

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      planId: 'make-a-snack',
      supportsUsed: ['order check'],
    }));
  });

  it('provides an optional one-step view without removing button controls', () => {
    render(<DyspraxiaStepPlannerActivity onComplete={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Turn on one-step mode' }));

    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(getVisibleSteps()).toEqual(['Pack the things I need']);
    expect(screen.getByRole('button', { name: 'Move Pack the things I need down' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    expect(getVisibleSteps()).toEqual(['Put on my shoes and coat']);
  });

  it('allows a checked partial plan and returns the exact neutral session payload', () => {
    const onComplete = jest.fn<void, [DyspraxiaPlanningSessionInput]>();
    render(<DyspraxiaStepPlannerActivity onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose Pack my school bag plan' }));
    expect(getVisibleSteps()).toEqual([
      'Zip my bag and place it by the door',
      'Check what I need',
      'Put each item in my bag',
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Check my order' }));
    expect(screen.getByText(/steps match the example order/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'I need help' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save this plan' }));

    expect(onComplete).toHaveBeenCalledWith({
      sessionId: expect.any(String),
      activityId: 'dyspraxia-sequence-steps',
      planId: 'pack-my-school-bag',
      planTitle: 'Pack my school bag',
      orderedSteps: [
        'Zip my bag and place it by the door',
        'Check what I need',
        'Put each item in my bag',
      ],
      movesMade: 0,
      checksMade: 1,
      supportsUsed: ['order check'],
      confidence: 'need-help',
    });
  });

  it('records move and one-step supports in a saved plan', () => {
    const onComplete = jest.fn<void, [DyspraxiaPlanningSessionInput]>();
    render(<DyspraxiaStepPlannerActivity onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Move Pack the things I need down' }));
    fireEvent.click(screen.getByRole('button', { name: 'Turn on one-step mode' }));
    fireEvent.click(screen.getByRole('button', { name: 'I feel confident' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save this plan' }));

    expect(onComplete).toHaveBeenCalledWith({
      sessionId: expect.any(String),
      activityId: 'dyspraxia-sequence-steps',
      planId: 'get-ready-for-school',
      planTitle: 'Get ready for school',
      orderedSteps: [
        'Put on my shoes and coat',
        'Pack the things I need',
        'Put on my clothes',
      ],
      movesMade: 1,
      checksMade: 0,
      supportsUsed: ['large move controls', 'one-step mode'],
      confidence: 'confident',
    });
  });
});
