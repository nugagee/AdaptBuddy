import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ChildDashboardNavbar from './ChildDashboardNavbar';

const mockSignOut = jest.fn();

jest.mock('hooks/useAuth', () => ({
  useAuth: () => ({
    profile: {
      first_name: 'Alex',
      full_name: 'Alex Guest',
      email: 'alex@example.test',
      neuro_types: ['dysgraphia', 'spd'],
      companion_onboarding_completed: true,
    },
    user: null,
    signOut: mockSignOut,
  }),
}));

jest.mock('features/child/hooks/useActiveChildSupportProfile', () => ({
  useActiveChildSupportProfile: () => ({
    childId: 'guest-child',
    supportProfile: {
      childId: 'guest-child',
      aboutMe: { preferredName: 'Love' },
    },
    preferredName: 'Love',
    age: 10,
    isGuest: true,
    isReady: true,
  }),
}));

jest.mock('constants/neuroOptions', () => ({
  NEURO_OPTION_MAP: {
    dysgraphia: { name: 'Dysgraphia' },
    spd: { name: 'Sensory Processing' },
  },
}));

describe('ChildDashboardNavbar', () => {
  it('uses the child Support Passport name instead of the generic guest name', () => {
    render(
      <MemoryRouter initialEntries={['/child/dashboard']}>
        <ChildDashboardNavbar />
      </MemoryRouter>,
    );

    expect(screen.getByText('Hi, Love! 👋')).toBeInTheDocument();
    expect(screen.queryByText('Hi, Alex! 👋')).not.toBeInTheDocument();
  });

  it('labels the selected support profiles without assuming Autism', () => {
    render(
      <MemoryRouter initialEntries={['/child/dashboard']}>
        <ChildDashboardNavbar />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open child account menu' }));

    expect(screen.getByText('Dysgraphia · Sensory Processing')).toBeInTheDocument();
    expect(screen.queryByText('Autism companion')).not.toBeInTheDocument();
  });
});
