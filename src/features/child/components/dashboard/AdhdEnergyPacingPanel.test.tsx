import React from 'react';
import { render, screen } from '@testing-library/react';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import AdhdEnergyPacingPanel from './AdhdEnergyPacingPanel';

describe('AdhdEnergyPacingPanel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-02T09:30:00.000Z'));
    prepareReadyChildScope();
    useChildProgressStore.setState({ adhdEnergyPacing: null });
  });

  afterEach(() => {
    clearReadyChildScope();
    jest.useRealTimers();
  });

  it('invites a check-in when no pacing plan exists today', () => {
    render(<AdhdEnergyPacingPanel />);
    expect(screen.getByText(/complete energy check-in/i)).toBeInTheDocument();
  });

  it('shows today\'s saved task, break, and first-step plan', () => {
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

    render(<AdhdEnergyPacingPanel />);

    expect(screen.getByRole('heading', { name: 'Low battery' })).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Choose the easiest visible action.')).toBeInTheDocument();
  });
});
