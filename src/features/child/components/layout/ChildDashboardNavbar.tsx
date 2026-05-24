import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  LogOut,
  Music,
  PenTool,
  Settings,
} from 'lucide-react';
import { useAuth } from 'hooks/useAuth';
import { ROUTES } from 'constants/routes';
import { NEURO_OPTION_MAP } from 'constants/neuroOptions';
import adaptbuddyLogo from 'assets/Adaptbuddy_logo.png';

const navItems = [
  { to: ROUTES.CHILD_DASHBOARD, label: 'Home', icon: Home },
  { to: ROUTES.MUSIC, label: 'Music', icon: Music },
  { to: ROUTES.WRITING_PAD, label: 'Writing', icon: PenTool },
  { to: ROUTES.CHILD_SETTINGS, label: 'Settings', icon: Settings },
];

const ChildDashboardNavbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();

  const firstName = profile?.first_name || user?.user_metadata?.first_name || 'Friend';
  const avatarUrl = profile?.avatar_url;
  const initials = firstName.charAt(0).toUpperCase();

  const neuroLabel =
    profile?.neuro_types?.length
      ? profile.neuro_types
          .slice(0, 2)
          .map((id) => NEURO_OPTION_MAP[id]?.name.split(' ').slice(1).join(' ') || id)
          .join(' · ')
      : 'Set up your profile';

  const handleSignOut = async () => {
    await signOut();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/85">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to={ROUTES.CHILD_DASHBOARD} className="flex min-w-0 items-center gap-3">
          <img src={adaptbuddyLogo} alt="" className="h-9 w-9 rounded-xl object-contain" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-adapt-navy dark:text-gray-100">
              My AdaptBuddy
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-gray-400">
              Hi, {firstName}! 👋
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Child dashboard">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? 'bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-adapt-navy dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-medium text-slate-500 dark:text-gray-400">Learning profile</p>
            <p className="max-w-[10rem] truncate text-xs text-adapt-indigo dark:text-adapt-cyan">
              {neuroLabel}
            </p>
          </div>

          <Link
            to={ROUTES.CHILD_SETTINGS}
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-adapt-indigo to-adapt-teal text-sm font-bold text-white ring-2 ring-white dark:ring-gray-800"
            aria-label="Open settings"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <nav
        className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden dark:border-gray-800"
        aria-label="Mobile child dashboard"
      >
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                active
                  ? 'bg-adapt-indigo/10 text-adapt-indigo'
                  : 'text-slate-600 dark:text-gray-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
};

export default ChildDashboardNavbar;
