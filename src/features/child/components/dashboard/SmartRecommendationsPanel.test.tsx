import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { getAllActivitiesForNeuro } from 'features/child/data/neuroDashboardContent';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import SmartRecommendationsPanel from './SmartRecommendationsPanel';

const readyAdhdTools = () => getAllActivitiesForNeuro('adhd')
  .filter((activity) => activity.availability !== 'planned');

describe('SmartRecommendationsPanel catalogue handoff', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-02T09:30:00.000Z'));
    prepareReadyChildScope();
    useChildProgressStore.setState({ completions: [], todayMood: null, adhdEnergyPacing: null });
  });

  afterEach(() => {
    clearReadyChildScope();
    jest.useRealTimers();
  });

  it('shows and launches real catalogue tools without relabelling their duration as an energy-plan cap', () => {
    useChildProgressStore.getState().setAdhdEnergyPacing({
      energyId: 'low', energyLabel: 'Low battery', emoji: '🪫',
      taskMinutes: 5, breakMinutes: 3, recommendationMood: 'tired',
      plan: 'Use a short task and a proper reset.',
      firstStep: 'Choose the easiest visible action.',
    });
    const onTryRecommendation = jest.fn();
    render(<SmartRecommendationsPanel neuroTypes={['adhd']} onTryRecommendation={onTryRecommendation} />);
    expect(screen.getByRole('heading', { name: 'Suggested support tools' })).toBeInTheDocument();
    expect(screen.getByText(/not a diagnosis or an ability score/i)).toBeInTheDocument();
    const expected = readyAdhdTools().slice(0, 3);
    const cards = screen.getAllByRole('article');
    expect(expected).toHaveLength(3);
    expect(cards).toHaveLength(expected.length);
    expected.forEach((activity, index) => {
      const card = within(cards[index]);
      expect(card.getByRole('heading', { name: activity.title })).toBeInTheDocument();
      expect(card.getByText(`About ${activity.durationMinutes} min`)).toBeInTheDocument();
      expect(card.getByText('Ready now')).toBeInTheDocument();
      fireEvent.click(card.getByRole('button', { name: 'Open tool' }));
      expect(onTryRecommendation).toHaveBeenNthCalledWith(index + 1, activity);
    });
    expect(onTryRecommendation).toHaveBeenCalledTimes(expected.length);
    // The child's separate pacing plan must remain intact; tool metadata is not a reward shortcut.
    expect(useChildProgressStore.getState().adhdEnergyPacing).toEqual(
      expect.objectContaining({ energyId: 'low', taskMinutes: 5, breakMinutes: 3 }),
    );
  });

  it('omits a tool already completed today by the ready child', () => {
    const activity = readyAdhdTools()[0];
    useChildProgressStore.setState({ completions: [{
      activityId: activity.id, neuroId: 'adhd', completedAt: '2026-09-02T09:00:00.000Z',
      starsEarned: 0, durationMinutes: activity.durationMinutes,
    }] });
    render(<SmartRecommendationsPanel neuroTypes={['adhd']} onTryRecommendation={jest.fn()} />);
    expect(screen.queryByRole('heading', { name: activity.title })).not.toBeInTheDocument();
  });

  it('does not use another child\'s completions to personalize suggestions', () => {
    const activity = readyAdhdTools()[0];
    useChildProgressStore.setState({ ownerId: 'different-child', completions: [{
      activityId: activity.id, neuroId: 'adhd', completedAt: '2026-09-02T09:00:00.000Z',
      starsEarned: 0, durationMinutes: activity.durationMinutes,
    }] });
    render(<SmartRecommendationsPanel neuroTypes={['adhd']} onTryRecommendation={jest.fn()} />);
    expect(screen.getByRole('heading', { name: activity.title })).toBeInTheDocument();
  });

  it('does not invent suggestions when no support profile is selected', () => {
    const { container } = render(<SmartRecommendationsPanel neuroTypes={[]} onTryRecommendation={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
