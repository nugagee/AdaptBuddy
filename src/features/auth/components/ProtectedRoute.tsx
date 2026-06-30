import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from 'hooks/useAuth';
import { ROUTES } from 'constants/routes';
import { hasStoredGuestMode, useAuthStore } from 'store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const { user, session, loading, initialized, isGuest, profile } = useAuth();
  const restoreGuestMode = useAuthStore((s) => s.restoreGuestMode);

  const isAuthenticated = Boolean(user ?? session?.user);
  const canUseGuestRoute = isGuest && Boolean(profile);
  const storedGuestMode = hasStoredGuestMode();

  useEffect(() => {
    if (!isAuthenticated && !canUseGuestRoute && storedGuestMode) {
      restoreGuestMode();
    }
  }, [canUseGuestRoute, isAuthenticated, restoreGuestMode, storedGuestMode]);

  if (storedGuestMode && !canUseGuestRoute && !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading guest mode...</p>
      </div>
    );
  }

  if ((loading || !initialized) && !isAuthenticated && !canUseGuestRoute) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated && !canUseGuestRoute) {
    return (
      <Navigate
        to={ROUTES.LOGIN}
        replace
        state={{
          unauthorized: true,
          message: 'Please sign in to access this page.',
          from: location.pathname,
        }}
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
