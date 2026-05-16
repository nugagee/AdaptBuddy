import React from 'react';
import { useLocation } from 'react-router-dom';
import ThemeToggle from 'components/accessibility/ThemeToggle';
import { ROUTES } from 'constants/routes';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { pathname } = useLocation();
  const isMarketing = pathname === ROUTES.HOME;

  return (
    <div className={`min-h-screen ${isMarketing ? '' : 'bg-white dark:bg-gray-900 sepia:bg-sepia-50'} transition-colors duration-300`}>
      {!isMarketing && <ThemeToggle />}
      {children}
    </div>
  );
};

export default MainLayout;
