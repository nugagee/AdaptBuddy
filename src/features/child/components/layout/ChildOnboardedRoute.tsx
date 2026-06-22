import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from 'hooks/useAuth';
import { ROUTES } from 'constants/routes';

interface ChildOnboardedRouteProps {
  children: React.ReactNode;
}

/** Redirects child users through neuro selection → companion onboarding before dashboard. */
const ChildOnboardedRoute: React.FC<ChildOnboardedRouteProps> = ({ children }) => {
  const { profile } = useAuth();

  if (profile?.role === 'child') {
    if (!profile.neuro_types.length) {
      return <Navigate to={ROUTES.NEURO_SELECTOR} replace />;
    }
    if (!profile.companion_onboarding_completed || !profile.onboarding_completed) {
      return <Navigate to={ROUTES.COMPANION_ONBOARDING} replace />;
    }
  }

  return <>{children}</>;
};

export default ChildOnboardedRoute;
