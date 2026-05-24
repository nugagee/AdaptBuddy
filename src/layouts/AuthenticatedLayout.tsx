import React from 'react';
import AuthSuccessBanner from 'components/auth/AuthSuccessBanner';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

/** Wraps authenticated app screens with consistent bottom padding for dev nav */
const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({ children }) => (
  <div className="pb-32">
    <AuthSuccessBanner />
    {children}
  </div>
);

export default AuthenticatedLayout;
