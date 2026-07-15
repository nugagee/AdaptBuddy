import React from 'react';
import AuthSuccessBanner from 'components/auth/AuthSuccessBanner';
import NotificationCenter from 'components/notifications/NotificationCenter';
import ChildSessionTracker from 'features/child/components/layout/ChildSessionTracker';
import { useAuth } from 'hooks/useAuth';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

/** Wraps authenticated app screens with consistent bottom padding for dev nav */
const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({ children }) => {
  const { profile } = useAuth();
  const trackChildSession = profile?.role === 'child';

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
