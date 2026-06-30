import React from 'react';
import { render, screen } from '@testing-library/react';
import AppComponent from './App';

test('renders AdaptBuddy landing page', () => {
  render(<AppComponent />);
  expect(screen.getByRole('link', { name: /AdaptBuddy/i })).toBeInTheDocument();
});
