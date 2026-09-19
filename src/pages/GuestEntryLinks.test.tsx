import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ROUTES } from 'constants/routes';
import HeroSection from './LandingPage/components/HeroSection';
import LoginPage from './LoginPage';

jest.mock('hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: jest.fn(),
    user: null,
    loading: false,
  }),
}));

jest.mock('components/animations/TypingBuddyMessage', () => ({
  __esModule: true,
  default: () => <span>Welcome to AdaptBuddy</span>,
}));

it('opens the role chooser from the landing-page guest button', () => {
  render(
    <MemoryRouter>
      <HeroSection />
    </MemoryRouter>,
  );

  expect(screen.getByRole('link', { name: 'Enter as guest' })).toHaveAttribute(
    'href',
    ROUTES.GUEST_ENTRY,
  );
});

it('opens the role chooser from the sign-in guest button', () => {
  render(
    <MemoryRouter initialEntries={[ROUTES.LOGIN]}>
      <LoginPage />
    </MemoryRouter>,
  );

  expect(screen.getByRole('link', { name: 'Enter as guest' })).toHaveAttribute(
    'href',
    ROUTES.GUEST_ENTRY,
  );
});
