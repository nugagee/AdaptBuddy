import React from 'react';
import { render, screen } from '@testing-library/react';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import AchievementBadgesPanel from './AchievementBadgesPanel';

describe('AchievementBadgesPanel', () => {
  beforeEach(() => {
    useChildProgressStore.setState({ achievementBadges: [] });
  });

  it('points to Quest Chain before the first badge is unlocked', () => {
    render(<AchievementBadgesPanel />);
    expect(screen.getByText('Complete Quest Chain to unlock the first badge.')).toBeInTheDocument();
  });

  it('keeps an unlocked badge visible on the dashboard', () => {
    useChildProgressStore.setState({
      achievementBadges: [
        {
          id: 'adhd-chain-builder',
          title: 'Chain Builder',
          description: 'Completed three tiny wins in a row.',
          emoji: '🔗',
          unlockedAt: '2026-09-01T09:30:00.000Z',
        },
      ],
    });

    render(<AchievementBadgesPanel />);
    expect(screen.getByText('Chain Builder')).toBeInTheDocument();
    expect(screen.getByText('Completed three tiny wins in a row.')).toBeInTheDocument();
  });
});
