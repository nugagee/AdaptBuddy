import React from 'react';
import { Navigate } from 'react-router-dom';
import { ROUTES } from 'constants/routes';
import { useAuth } from 'hooks/useAuth';

interface RequireTeacherRouteProps {
  children: React.ReactNode;
}

const RequireTeacherRoute: React.FC<RequireTeacherRouteProps> = ({ children }) => {
  const { profile, user, loading, isGuest } = useAuth();

  if (loading && !user && !isGuest) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-gray-950">
        <p className="text-sm text-slate-500 dark:text-gray-400">Loading teacher session...</p>
      </div>
    );
  }

  if (isGuest && profile?.role === 'teacher') return <>{children}</>;

  if (!user || !profile) {
    return (
      <Navigate
        to={ROUTES.LOGIN}
        replace
        state={{
          unauthorized: true,
          message: 'Please sign in with a teacher account to access this page.',
          from: ROUTES.TEACHER_DASHBOARD,
        }}
      />
    );
  }

  if (profile.role === 'admin' || profile.role === 'teacher') return <>{children}</>;

  if (profile.role === 'parent') return <Navigate to={ROUTES.PARENT_HUB} replace />;
  return <Navigate to={ROUTES.CHILD_DASHBOARD} replace />;
};

export default RequireTeacherRoute;
