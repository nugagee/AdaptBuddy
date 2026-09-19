import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ROUTES } from 'constants/routes';
import TeacherLogin from './TeacherLogin';

function SignInDestination() {
  const location = useLocation();
  return <p>Sign in to continue to {location.state?.from}</p>;
}

it('routes the legacy teacher portal to real sign-in with the teacher destination preserved', async () => {
  render(
    <MemoryRouter initialEntries={[ROUTES.TEACHER_LOGIN]}>
      <Routes>
        <Route path={ROUTES.TEACHER_LOGIN} element={<TeacherLogin />} />
        <Route path={ROUTES.LOGIN} element={<SignInDestination />} />
        <Route path={ROUTES.TEACHER_DASHBOARD} element={<p>Teacher dashboard</p>} />
      </Routes>
    </MemoryRouter>
  );
  expect(await screen.findByText(`Sign in to continue to ${ROUTES.TEACHER_DASHBOARD}`)).toBeInTheDocument();
  expect(screen.queryByText('Teacher dashboard')).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});
