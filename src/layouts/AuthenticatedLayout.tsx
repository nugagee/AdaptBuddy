import React from 'react';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

/** Wraps authenticated app screens with consistent bottom padding for dev nav */
const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({ children }) => (
  <div className="pb-32">{children}</div>
);

export default AuthenticatedLayout;
