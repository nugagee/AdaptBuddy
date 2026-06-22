import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from 'hooks/useAuth';
import { ROUTES } from 'constants/routes';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const { user, session, loading, initialized } = useAuth();

  const isAuthenticated = Boolean(user ?? session?.user);

  if ((loading || !initialized) && !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
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
