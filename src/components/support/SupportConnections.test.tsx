import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as service from 'services/supabase/autismProfileService';
import SupportConnectionsPanel from './SupportConnectionsPanel';
import SupportRequestAction from './SupportRequestAction';
import MoodCheckInPanel from 'features/child/components/companion/MoodCheckInPanel';
import { respondToMoodCheckIn } from 'services/ai';
jest.mock('services/ai', () => ({ isOpenAiConfigured: true, buildCompanionContext: () => ({}), respondToMoodCheckIn: jest.fn() }));

let mockAuth: any;
jest.mock('hooks/useAuth', () => ({ useAuth: () => mockAuth }));
jest.mock('constants/releaseCapabilities', () => ({
  TRUSTED_ADULT_INVITATIONS_ENABLED: true, SUPPORT_RECORDING_ENABLED: true,
  DIRECT_ADULT_GUIDANCE: 'Please speak to a safe adult nearby.',
}));
jest.mock('services/supabase/autismProfileService', () => ({
  fetchAdultSupportInvitations: jest.fn(), fetchSupportRequests: jest.fn(), fetchTrustedAdultsForChild: jest.fn(),
  saveTrustedAdultForChild: jest.fn(), respondToSupportInvitation: jest.fn(), revokeSupportContact: jest.fn(),
  acknowledgeSupportRequest: jest.fn(), requestTrustedAdultSupport: jest.fn(), saveMoodCheckIn: jest.fn(),
}));
const contact = { id: 'contact-a', name: 'Alex', email: 'alex@example.invalid', child_name: 'Sam', status: 'pending' };
const mock = (fn: unknown) => fn as jest.Mock;
beforeEach(() => {
  jest.resetAllMocks();
  mockAuth = { user: { id: 'child' }, profile: { role: 'child' }, isGuest: false };
  mock(service.fetchTrustedAdultsForChild).mockResolvedValue([]);
  mock(service.fetchAdultSupportInvitations).mockResolvedValue([]);
  mock(service.fetchSupportRequests).mockResolvedValue([]);
  Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: jest.fn().mockReturnValue('request-uuid') } });
});

test('child can create an in-app invitation with an explicit no-email result', async () => {
  render(<SupportConnectionsPanel />);
  await screen.findByText('No support invitations or accepted connections yet.');
  fireEvent.change(screen.getByLabelText('Adult’s name'), { target: { value: 'Alex' } });
  fireEvent.change(screen.getByLabelText('Adult’s email'), { target: { value: 'alex@example.invalid' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create in-app invitation' }));
  expect(await screen.findByText(/Invitation recorded in AdaptBuddy. No email or text was sent/)).toBeInTheDocument();
  expect(service.saveTrustedAdultForChild).toHaveBeenCalledWith('child', { name: 'Alex', email: 'alex@example.invalid', role: 'parent', phone: '' });
});

test('parent sees an invitation without a legacy family link and must attest before accepting', async () => {
  mockAuth = { user: { id: 'adult' }, profile: { role: 'parent' }, isGuest: false };
  mock(service.fetchAdultSupportInvitations).mockResolvedValue([contact]);
  render(<SupportConnectionsPanel />);
  expect(await screen.findByText('Invitation from Sam')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Accept invitation' })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Accept invitation' }));
  await waitFor(() => expect(service.respondToSupportInvitation).toHaveBeenCalledWith('contact-a', true, true));
  expect(await screen.findByText('Invitation accepted for support requests only.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Decline invitation' }));
  await waitFor(() => expect(service.respondToSupportInvitation).toHaveBeenCalledWith('contact-a', false));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh support inbox' })).toBeEnabled());
});

test('child can end a connection and parent can acknowledge an addressed record', async () => {
  mock(service.fetchTrustedAdultsForChild).mockResolvedValue([{ ...contact, status: 'connected' }]);
  const { rerender } = render(<SupportConnectionsPanel />);
  fireEvent.click(await screen.findByRole('button', { name: 'End support connection' }));
  await waitFor(() => expect(service.revokeSupportContact).toHaveBeenCalledWith('contact-a'));
  mockAuth = { user: { id: 'adult' }, profile: { role: 'parent' }, isGuest: false };
  mock(service.fetchSupportRequests).mockResolvedValue([{ id: 'record', contact_id: 'contact-a', child_name: 'Sam', adult_name: 'Alex', created_at: '2026-09-08T10:00:00Z', connection_active: true, seen_at: null }]);
  rerender(<SupportConnectionsPanel />);
  fireEvent.click(await screen.findByRole('button', { name: 'Mark as seen' }));
  await waitFor(() => expect(service.acknowledgeSupportRequest).toHaveBeenCalledWith('record'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh support inbox' })).toBeEnabled());
});

test('failed invitation makes no success claim and keeps entered fields for retry', async () => {
  mock(service.saveTrustedAdultForChild).mockRejectedValue(new Error('Connection unavailable'));
  render(<SupportConnectionsPanel />);
  await screen.findByText('No support invitations or accepted connections yet.');
  fireEvent.change(screen.getByLabelText('Adult’s name'), { target: { value: 'Alex' } });
  fireEvent.change(screen.getByLabelText('Adult’s email'), { target: { value: 'alex@example.invalid' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create in-app invitation' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Connection unavailable');
  expect(screen.getByLabelText('Adult’s email')).toHaveValue('alex@example.invalid');
  expect(screen.queryByText(/Invitation recorded in AdaptBuddy/)).not.toBeInTheDocument();
});

test('account change discards previous inbox and ignores its late response', async () => {
  let resolveOld: (value: unknown[]) => void = () => {};
  mock(service.fetchTrustedAdultsForChild).mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
  const { rerender } = render(<SupportConnectionsPanel />);
  mockAuth = { user: { id: 'other' }, profile: { role: 'child' }, isGuest: false };
  rerender(<SupportConnectionsPanel />);
  await screen.findByText('No support invitations or accepted connections yet.');
  await act(async () => { resolveOld([contact]); });
  expect(screen.queryByText('Alex')).not.toBeInTheDocument();
});

test('request defaults private and shares only after selecting an accepted recipient', async () => {
  mock(service.fetchTrustedAdultsForChild).mockResolvedValue([{ ...contact, status: 'connected' }, { ...contact, id: 'pending', name: 'Pending adult' }]);
  render(<SupportRequestAction source="mood-check-in" urgent contextKey="mood-1" />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Record support request' })).toBeEnabled());
  expect(screen.getByRole('combobox')).toHaveValue('');
  expect(screen.queryByRole('option', { name: 'Pending adult' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Record support request' }));
  expect(await screen.findByText(/Recorded privately for you. No adult received/)).toBeInTheDocument();
  expect(service.requestTrustedAdultSupport).toHaveBeenLastCalledWith('child', 'mood-check-in', true, 'request-uuid', null);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'contact-a' } });
  fireEvent.click(screen.getByRole('button', { name: 'Record support request' }));
  expect(await screen.findByText(/This does not confirm they have seen it/)).toBeInTheDocument();
  expect(service.requestTrustedAdultSupport).toHaveBeenLastCalledWith('child', 'mood-check-in', true, 'request-uuid', 'contact-a');
});

test('uncertain recording retry preserves its idempotency key', async () => {
  mock(service.requestTrustedAdultSupport).mockRejectedValueOnce(new Error('Lost response')).mockResolvedValueOnce('record');
  render(<SupportRequestAction source="buddy-conversation" urgent contextKey="reply-1" />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Record support request' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Record support request' }));
  expect(await screen.findByText(/could not confirm the record/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Record support request' }));
  await screen.findByText(/Recorded privately/);
  expect(mock(service.requestTrustedAdultSupport).mock.calls[0]).toEqual(mock(service.requestTrustedAdultSupport).mock.calls[1]);
  expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
});

test('guest cannot create invitations or real support records', () => {
  mockAuth.isGuest = true;
  render(<><SupportConnectionsPanel /><SupportRequestAction source="buddy-conversation" urgent contextKey="guest" /></>);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(service.fetchTrustedAdultsForChild).not.toHaveBeenCalled();
  expect(service.fetchSupportRequests).not.toHaveBeenCalled();
});


test('separate mood check-ins with identical replies require fresh recipient selection and record IDs', async () => {
  mock(service.fetchTrustedAdultsForChild).mockResolvedValue([{ ...contact, status: 'connected' }]);
  mock(respondToMoodCheckIn).mockResolvedValue({ response: 'Please find a safe adult.', adultActionRequired: true, riskLevel: 'urgent' });
  mock(crypto.randomUUID).mockReturnValueOnce('first-record').mockReturnValueOnce('second-record');
  render(<MoodCheckInPanel />);
  fireEvent.click(screen.getByRole('button', { name: /Worried/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Share with AdaptBuddy' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Record support request' })).toBeEnabled());
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'contact-a' } });
  fireEvent.click(screen.getByRole('button', { name: 'Record support request' }));
  await screen.findByText(/Recorded for your selected adult/);
  fireEvent.click(screen.getByRole('button', { name: 'Share with AdaptBuddy' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Record support request' })).toBeEnabled());
  expect(screen.getByRole('combobox')).toHaveValue('');
  fireEvent.click(screen.getByRole('button', { name: 'Record support request' }));
  await screen.findByText(/Recorded privately/);
  expect(mock(service.requestTrustedAdultSupport).mock.calls.map(args => [args[3], args[4]])).toEqual([
    ['first-record', 'contact-a'], ['second-record', null],
  ]);
});
