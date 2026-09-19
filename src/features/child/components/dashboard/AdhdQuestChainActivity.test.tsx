import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { AchievementBadgeInput } from 'features/child/store/childProgressStore';
import AdhdQuestChainActivity, { QUEST_CHAIN_BADGE } from './AdhdQuestChainActivity';

describe('AdhdQuestChainActivity', () => {
  it('keeps later wins locked and builds steps that match the chosen goal', () => {
    render(<AdhdQuestChainActivity onComplete={jest.fn()} />);

    const goalInput = screen.getByRole('textbox', { name: 'My goal' });
    fireEvent.change(goalInput, { target: { value: 'Read chapter 2' } });

    expect(screen.getByText('Open the book or text and find the starting place.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Complete win 1' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Win 2 locked' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Win 3 locked' })).toBeDisabled();
  });

  it('unlocks a persistent badge after three sequential wins', () => {
    const onComplete = jest.fn<void, [AchievementBadgeInput]>();
    render(<AdhdQuestChainActivity onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Complete win 1' }));
    expect(screen.getByRole('textbox', { name: 'My goal' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Complete win 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Complete win 3' }));

    expect(screen.getByText('All three wins connected.')).toBeInTheDocument();
    expect(screen.getByText('Badge unlocked')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chain Builder' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save badge and finish' }));
    expect(onComplete).toHaveBeenCalledWith(QUEST_CHAIN_BADGE);
  });

  it('can undo the latest win and edit the goal again', () => {
    render(<AdhdQuestChainActivity onComplete={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Complete win 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Undo last win' }));

    expect(screen.getByText('0 of 3 tiny wins connected.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'My goal' })).toBeEnabled();
  });
});
