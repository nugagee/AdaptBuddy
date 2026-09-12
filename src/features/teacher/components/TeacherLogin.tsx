import React from 'react';
import { Navigate } from 'react-router-dom';
import { ROUTES } from 'constants/routes';

// The legacy portal used to simulate a login without authenticating an account.
// All teacher credentials must now go through the shared Supabase sign-in flow.
const TeacherLogin: React.FC = () => (
  <Navigate to={ROUTES.LOGIN} replace state={{ from: ROUTES.TEACHER_DASHBOARD }} />
);

export default TeacherLogin;
