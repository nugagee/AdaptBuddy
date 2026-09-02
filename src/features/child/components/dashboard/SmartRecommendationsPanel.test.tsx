import React from 'react';
import { render, screen } from '@testing-library/react';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import SmartRecommendationsPanel from './SmartRecommendationsPanel';

describe('SmartRecommendationsPanel energy pacing', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-02T09:30:00.000Z'));
    useChildProgressStore.setState({
      completions: [],
      todayMood: null,
      adhdEnergyPacing: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('caps recommendation times to today\'s selected energy pace', () => {
    useChildProgressStore.getState().setAdhdEnergyPacing({
      energyId: 'low',
      energyLabel: 'Low battery',
      emoji: '🪫',
      taskMinutes: 5,
      breakMinutes: 3,
      recommendationMood: 'tired',
      plan: 'Use a short task and a proper reset.',
      firstStep: 'Choose the easiest visible action.',
    });

    render(
      <SmartRecommendationsPanel
        neuroTypes={['adhd']}
        onTryRecommendation={jest.fn()}
      />,
    );

    expect(screen.getByText(/low battery pace/i)).toBeInTheDocument();
    expect(screen.getAllByText('5 min')).toHaveLength(3);
    expect(screen.getAllByText('5-min pace')).toHaveLength(3);
  });
});
