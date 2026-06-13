import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from 'hooks/useAuth';
import { isAdminProfile } from 'services/supabase/authService';
import { ROUTES } from 'constants/routes';

interface RequireAdminRouteProps {
  children: React.ReactNode;
}

const RequireAdminRoute: React.FC<RequireAdminRouteProps> = ({ children }) => {
  const { user, profile, loading } = useAuth();

  if (loading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <p className="text-sm text-gray-400">Loading admin session…</p>
      </div>
    );
  }

  if (!user || !isAdminProfile(profile)) {
    return <Navigate to={ROUTES.ADMIN_LOGIN} replace />;
  }

  if (profile?.status === 'suspended' || profile?.is_authorized === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-950 px-6 text-center">
        <p className="text-lg font-semibold text-red-400">Admin access suspended</p>
        <p className="max-w-md text-sm text-gray-400">
          Your administrator account is not authorized. Contact a superadmin.
        </p>
        <a href={ROUTES.ADMIN_LOGIN} className="text-sm text-indigo-400 hover:underline">
          Back to admin login
        </a>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireAdminRoute;
