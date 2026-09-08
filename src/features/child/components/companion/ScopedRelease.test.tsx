import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { respondToMoodCheckIn, sendBuddyMessage } from 'services/ai';
import { saveMoodCheckIn, requestTrustedAdultSupport, saveTrustedAdultForChild, fetchTrustedAdultsForChild } from 'services/supabase/autismProfileService';
import MoodCheckInPanel from './MoodCheckInPanel';
import BuddyConversationPanel from './BuddyConversationPanel';
import SettingsPage from 'features/child/pages/SettingsPage';

jest.mock('hooks/useAuth', () => {
  const auth = {
    user: { id: 'child' }, isGuest: false, setProfile: jest.fn(),
    profile: { id: 'child', first_name: 'Test', last_name: 'Child', role: 'child', neuro_types: ['adhd'], age: 10 },
  };
  return { useAuth: () => auth };
});
jest.mock('services/ai', () => ({
  isOpenAiConfigured: true, buildCompanionContext: () => ({}),
  respondToMoodCheckIn: jest.fn(), sendBuddyMessage: jest.fn(),
}));
jest.mock('services/supabase/autismProfileService', () => ({
  saveMoodCheckIn: jest.fn(), requestTrustedAdultSupport: jest.fn(),
  saveTrustedAdultForChild: jest.fn(), fetchTrustedAdultsForChild: jest.fn(),
}));
jest.mock('services/supabase/profileService', () => ({ updateUserProfile: jest.fn(), uploadProfileAvatar: jest.fn() }));
jest.mock('features/child/components/layout/ChildDashboardNavbar', () => () => null);
jest.mock('components/feedback/FeedbackPulsePanel', () => () => null);

beforeEach(() => { jest.clearAllMocks(); });

test('mood check-ins still save while urgent guidance cannot record a support request', async () => {
  (respondToMoodCheckIn as jest.Mock).mockResolvedValue({ response: 'Please find a safe adult.', adultActionRequired: true, riskLevel: 'urgent' });
  (saveMoodCheckIn as jest.Mock).mockResolvedValue(undefined);
  render(<MoodCheckInPanel />);
  fireEvent.click(screen.getByRole('button', { name: /Worried/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Share with AdaptBuddy' }));
  expect(await screen.findByText(/Check-in saved/)).toBeInTheDocument();
  expect(saveMoodCheckIn).toHaveBeenCalledWith('child', 'worried', '', 'Please find a safe adult.');
  expect(screen.getByText(/AdaptBuddy cannot contact an adult for you/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Record support request' })).not.toBeInTheDocument();
  expect(requestTrustedAdultSupport).not.toHaveBeenCalled();
});

test('Buddy conversation provides direct help guidance without unavailable recording', async () => {
  (sendBuddyMessage as jest.Mock).mockResolvedValue({ content: 'Please find a safe adult.', adultActionRequired: true, riskLevel: 'urgent' });
  render(<BuddyConversationPanel />);
  fireEvent.click(screen.getByRole('button', { name: 'I need help from an adult' }));
  expect(await screen.findByText(/AdaptBuddy cannot contact an adult for you/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Record support request' })).not.toBeInTheDocument();
  expect(requestTrustedAdultSupport).not.toHaveBeenCalled();
});

test('settings keeps ordinary editing available while the invitation form is absent', async () => {
  render(<MemoryRouter><SettingsPage /></MemoryRouter>);
  await waitFor(() => expect(screen.getByText(/Trusted-adult connections are temporarily unavailable/)).toBeInTheDocument());
  expect(screen.queryByLabelText('Phone number')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Record request' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Save/ })).toBeInTheDocument();
  expect(saveTrustedAdultForChild).not.toHaveBeenCalled();
  expect(fetchTrustedAdultsForChild).not.toHaveBeenCalled();
});
