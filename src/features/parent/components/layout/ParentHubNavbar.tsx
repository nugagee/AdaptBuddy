import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, Home, LogOut, Shield, UsersRound } from 'lucide-react';
import { ROUTES } from 'constants/routes';
import { useAuth } from 'hooks/useAuth';
import adaptbuddyLogo from 'assets/Adaptbuddy_logo.png';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
}

const ParentHubNavbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    profile?.full_name ||
    user?.email?.split('@')[0] ||
    'Parent';

  const roleLabel =
    profile?.role === 'teacher'
      ? 'Teacher account'
      : profile?.role === 'admin'
        ? 'Admin account'
        : 'Parent account';

  const initials = displayName.trim().charAt(0).toUpperCase() || 'P';
  const avatarUrl = profile?.avatar_url;

  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      { to: ROUTES.HOME, label: 'Home', icon: Home },
      { to: ROUTES.PARENT_HUB, label: 'Parent Hub', icon: UsersRound },
    ];

    if (profile?.role === 'teacher') {
      items.push({
        to: ROUTES.TEACHER_DASHBOARD,
        label: 'Teacher',
        icon: GraduationCap,
      });
    }

    if (profile?.role === 'admin') {
      items.push({
        to: ROUTES.ADMIN_DASHBOARD,
        label: 'Admin',
        icon: Shield,
      });
    }

    return items;
  }, [profile?.role]);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      await signOut();
      navigate(ROUTES.LOGIN, { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/85">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3">
        <Link to={ROUTES.PARENT_HUB} className="flex min-w-0 items-center gap-2 sm:gap-3">
          <img src={adaptbuddyLogo} alt="" className="h-8 w-8 shrink-0 rounded-xl object-contain sm:h-9 sm:w-9" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-adapt-navy dark:text-gray-100">AdaptBuddy</p>
            <p className="hidden truncate text-xs text-slate-500 dark:text-gray-400 sm:block">
              Parent Hub
            </p>
          </div>
        </Link>

      

        <div className="relative z-50 flex shrink-0 items-center gap-1.5 sm:gap-3">
          <div className="hidden text-right sm:block">
            <p className="max-w-[10rem] truncate text-xs font-bold text-adapt-navy dark:text-gray-100">
              {displayName}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-gray-400">{roleLabel}</p>
          </div>

          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-adapt-indigo to-adapt-teal text-sm font-bold text-white ring-2 ring-white dark:ring-gray-800 sm:h-10 sm:w-10">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </span>

          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-red-900 dark:hover:bg-red-950/40 dark:hover:text-red-300"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
          </button>
        </div>
      </div>

      <nav
        className="flex justify-center gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 md:hidden dark:border-gray-800"
        aria-label="Mobile parent hub navigation"
      >
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                active
                  ? 'bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan'
                  : 'text-slate-600 dark:text-gray-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={isSigningOut}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-300"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden />
          {isSigningOut ? 'Signing out...' : 'Sign out'}
        </button>
      </nav>
    </header>
  );
};

export default ParentHubNavbar;
