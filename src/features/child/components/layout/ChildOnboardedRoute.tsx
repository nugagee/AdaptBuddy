import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from 'hooks/useAuth';
import { ROUTES } from 'constants/routes';

interface ChildOnboardedRouteProps {
  children: React.ReactNode;
}

/** Redirects new child users to neuro selection before dashboard access. */
const ChildOnboardedRoute: React.FC<ChildOnboardedRouteProps> = ({ children }) => {
  const { profile, isGuest } = useAuth();

  if (isGuest) return <>{children}</>;

  if (
    profile?.role === 'child' &&
    (!profile.onboarding_completed || profile.neuro_types.length === 0)
  ) {
    return <Navigate to={ROUTES.NEURO_SELECTOR} replace />;
  }

  return <>{children}</>;
};

export default ChildOnboardedRoute;
