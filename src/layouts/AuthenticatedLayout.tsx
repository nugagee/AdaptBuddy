import React from 'react';
import AuthSuccessBanner from 'components/auth/AuthSuccessBanner';
import NotificationCenter from 'components/notifications/NotificationCenter';
import ChildSessionTracker from 'features/child/components/layout/ChildSessionTracker';
import { useAuth } from 'hooks/useAuth';
import { isLearnerRole } from 'constants/roles';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

/** Wraps authenticated app screens with consistent bottom padding for dev nav */
const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({ children }) => {
  const { profile } = useAuth();
  const trackChildSession = isLearnerRole(profile?.role);

  return (
    <div className="pb-32">
      {trackChildSession && <ChildSessionTracker />}
      <AuthSuccessBanner />
      {children}
      <NotificationCenter />
    </div>
  );
};

export default AuthenticatedLayout;
