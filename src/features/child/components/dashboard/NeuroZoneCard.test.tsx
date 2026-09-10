import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import NeuroZoneCard from './NeuroZoneCard';
import type { NeuroActivity } from 'features/child/data/neuroDashboardContent';

jest.mock('constants/neuroOptions', () => ({
  NEURO_OPTION_MAP: {
    autism: {
      name: 'Autism support',
      learningStyle: 'Visual',
      icon: () => null,
    },
  },
}));

jest.mock('features/child/store/childProgressStore', () => ({
  useChildProgressStore: (selector: (state: unknown) => unknown) => selector({
    completions: [],
    metricValues: [],
  }),
}));

jest.mock('features/child/store/childProgressReadAccess', () => ({
  useChildProgressReadAccess: () => ({ isReady: true }),
}));

const ActivityIcon = () => null;

const makeActivity = (overrides: Partial<NeuroActivity>): NeuroActivity => ({
  id: 'activity',
  neuroId: 'autism',
  title: 'Support activity',
  description: 'Try a support tool.',
  durationMinutes: 5,
  category: 'focus',
  icon: ActivityIcon,
  inspiration: 'Child-led support',
  starsReward: 3,
  ...overrides,
});

describe('NeuroZoneCard', () => {
  it('does not advertise completion rewards for a routed tool', () => {
    const routed = makeActivity({ route: '/child/autism-space' });
    const onStartActivity = jest.fn();

    render(
      <NeuroZoneCard
        neuroId="autism"
        activities={[routed]}
        onStartActivity={onStartActivity}
      />,
    );

    expect(screen.getByText('Opens a learning tool')).toBeInTheDocument();
    expect(screen.queryByText('+3')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open tool' }));
    expect(onStartActivity).toHaveBeenCalledWith(routed);
  });

  it('shows time and rewards only for an in-place tracked activity', () => {
    const tracked = makeActivity({ id: 'tracked-activity' });

    render(
      <NeuroZoneCard
        neuroId="autism"
        activities={[tracked]}
        onStartActivity={jest.fn()}
      />,
    );

    expect(screen.getByText('5 min')).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start activity' })).toBeInTheDocument();
  });
});
