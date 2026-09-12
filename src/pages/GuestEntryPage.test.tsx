import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ROUTES } from 'constants/routes';
import GuestEntryPage from './GuestEntryPage';

const mockSetGuestMode = jest.fn();

jest.mock('hooks/useAuth', () => ({
  useAuth: () => ({ setGuestMode: mockSetGuestMode }),
}));

const destinations = {
  child: { route: ROUTES.NEURO_SELECTOR, label: 'Child demo opened' },
  parent: { route: ROUTES.PARENT_HUB, label: 'Parent demo opened' },
  teacher: { route: ROUTES.TEACHER_DASHBOARD, label: 'Teacher demo opened' },
} as const;

const renderGuestEntry = (entry: string = ROUTES.GUEST_ENTRY) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path={ROUTES.GUEST_ENTRY} element={<GuestEntryPage />} />
        {Object.values(destinations).map(({ route, label }) => (
          <Route key={route} path={route} element={<p>{label}</p>} />
        ))}
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  mockSetGuestMode.mockReset();
  mockSetGuestMode.mockResolvedValue(true);
});

it('shows all three safe guest choices before entering a demo', () => {
  renderGuestEntry();

  expect(screen.getByRole('heading', { name: 'Choose a guest view' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Continue as a child' })).toHaveAttribute(
    'href',
    `${ROUTES.GUEST_ENTRY}?role=child`,
  );
  expect(screen.getByRole('link', { name: 'Continue as a parent' })).toHaveAttribute(
    'href',
    `${ROUTES.GUEST_ENTRY}?role=parent`,
  );
  expect(screen.getByRole('link', { name: 'Continue as a teacher' })).toHaveAttribute(
    'href',
    `${ROUTES.GUEST_ENTRY}?role=teacher`,
  );
  expect(mockSetGuestMode).not.toHaveBeenCalled();
});

it.each(Object.entries(destinations))(
  'opens the isolated %s guest destination after selection',
  async (role, destination) => {
    renderGuestEntry(`${ROUTES.GUEST_ENTRY}?role=${role}`);

    expect(await screen.findByText(destination.label)).toBeInTheDocument();
    expect(mockSetGuestMode).toHaveBeenCalledTimes(1);
    expect(mockSetGuestMode).toHaveBeenCalledWith(role);
  },
);

it('returns invalid guest links to the role chooser without starting a session', () => {
  renderGuestEntry(`${ROUTES.GUEST_ENTRY}?role=admin`);

  expect(screen.getByRole('heading', { name: 'Choose a guest view' })).toBeInTheDocument();
  expect(mockSetGuestMode).not.toHaveBeenCalled();
});

it('keeps the visitor on a recoverable screen if guest isolation fails', async () => {
  mockSetGuestMode.mockResolvedValue(false);
  renderGuestEntry(`${ROUTES.GUEST_ENTRY}?role=parent`);

  await waitFor(() => {
    expect(
      screen.getByText('Guest mode could not safely clear the signed-in session. Please sign out and try again.'),
    ).toBeInTheDocument();
  });
  expect(screen.getByRole('link', { name: 'Choose another guest view' })).toHaveAttribute(
    'href',
    ROUTES.GUEST_ENTRY,
  );
});
