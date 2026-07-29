import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  School,
  Settings,
  ShieldAlert,
  Users,
  FileBarChart,
} from 'lucide-react';
import { ROUTES } from 'constants/routes';
import { useAuth } from 'hooks/useAuth';
import { TeacherDashboardService } from 'features/teacher/services/teacherDashboardService';
import adaptbuddyLogo from 'assets/Adaptbuddy_logo.png';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface MenuNavItem extends NavItem {
  notificationKey: keyof TeacherNavNotifications;
}

interface TeacherNavNotifications {
  signals: number;
  messages: number;
  reports: number;
  settings: number;
}

const primaryNavItems: NavItem[] = [
  { to: ROUTES.TEACHER_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { to: ROUTES.TEACHER_CLASSES, label: 'Classes', icon: School },
  { to: ROUTES.TEACHER_STUDENTS, label: 'Students', icon: Users },
  { to: ROUTES.TEACHER_ASSIGNMENTS, label: 'Assignments', icon: ClipboardList },
];

const menuNavItems: MenuNavItem[] = [
  { to: ROUTES.TEACHER_SIGNALS, label: 'Signals', icon: ShieldAlert, notificationKey: 'signals' },
  { to: ROUTES.TEACHER_MESSAGES, label: 'Messages', icon: MessageSquare, notificationKey: 'messages' },
  { to: ROUTES.TEACHER_REPORTS, label: 'Reports', icon: FileBarChart, notificationKey: 'reports' },
  { to: ROUTES.TEACHER_SETTINGS, label: 'Settings', icon: Settings, notificationKey: 'settings' },
];

const emptyNotifications: TeacherNavNotifications = {
  signals: 0,
  messages: 0,
  reports: 0,
  settings: 0,
};

const isNavActive = (pathname: string, to: string): boolean =>
  pathname === to || (to !== ROUTES.TEACHER_DASHBOARD && pathname.startsWith(`${to}/`));

const TeacherHubNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user, isGuest, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<TeacherNavNotifications>(emptyNotifications);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    profile?.full_name ||
    user?.email?.split('@')[0] ||
    'Teacher';

  const email = profile?.email || user?.email || '';
  const initials = displayName.trim().charAt(0).toUpperCase() || 'T';
  const avatarUrl = profile?.avatar_url;

  const totalNotifications =
    notifications.signals +
    notifications.messages +
    notifications.reports +
    notifications.settings;

  const loadNotifications = useCallback(async () => {
    if (isGuest) {
      setNotifications({ signals: 1, messages: 1, reports: 0, settings: 0 });
      return;
    }

    try {
      const summary = await TeacherDashboardService.getDashboardSummary();
      setNotifications({
        signals: summary.totals.supportAlerts,
        messages: summary.totals.unreadMessages,
        reports: summary.totals.meetingRequests,
        settings: 0,
      });
    } catch {
      setNotifications(emptyNotifications);
    }
  }, [isGuest]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications, location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setMenuOpen(false);

    try {
      await signOut();
      navigate(ROUTES.TEACHER_LOGIN, { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleMenuNavigate = (to: string) => {
    setMenuOpen(false);
    navigate(to);
  };

  const renderNavLink = (item: NavItem, compact = false) => {
    const active = isNavActive(location.pathname, item.to);
    const Icon = item.icon;

    return (
      <Link
        key={item.to}
        to={item.to}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold transition ${
          compact ? 'px-3 py-1.5 text-xs' : 'gap-2 px-3 py-2 text-sm'
        } ${
          active
            ? 'bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan'
            : 'text-slate-600 hover:bg-slate-100 hover:text-adapt-navy dark:text-gray-300 dark:hover:bg-gray-800'
        }`}
      >
        <Icon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />
        {item.label}
      </Link>
    );
  };

  const renderCountBadge = (count: number, compact = false) => {
    if (count <= 0) return null;

    return (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-red-500 font-black text-white ${
          compact
            ? 'min-w-[1.1rem] px-1 py-0.5 text-[10px]'
            : 'min-w-[1.25rem] px-1.5 py-0.5 text-[11px]'
        }`}
      >
        {count > 99 ? '99+' : count}
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/85">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3">
        <Link to={ROUTES.TEACHER_DASHBOARD} className="flex min-w-0 items-center gap-2 sm:gap-3">
          <img src={adaptbuddyLogo} alt="" className="h-8 w-8 shrink-0 rounded-xl object-contain sm:h-9 sm:w-9" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-adapt-navy dark:text-gray-100">AdaptBuddy</p>
            <p className="hidden truncate text-xs text-slate-500 dark:text-gray-400 sm:block">
              Teacher Hub
            </p>
          </div>
        </Link>

        <nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex"
          aria-label="Teacher dashboard navigation"
        >
          {primaryNavItems.map((item) => renderNavLink(item))}
        </nav>

        <div ref={menuRef} className="relative z-50 flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={
              totalNotifications > 0
                ? `Open teacher account menu, ${totalNotifications} notifications`
                : 'Open teacher account menu'
            }
            className="relative inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 shadow-sm transition hover:border-adapt-indigo/30 dark:border-gray-700 dark:bg-gray-800"
          >
            <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-adapt-indigo to-adapt-teal text-sm font-bold text-white sm:h-10 sm:w-10">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
              {totalNotifications > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-white dark:ring-gray-800">
                  {totalNotifications > 99 ? '99+' : totalNotifications}
                </span>
              )}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-slate-500 transition-transform dark:text-gray-400 ${
                menuOpen ? 'rotate-180' : ''
              }`}
              aria-hidden
            />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+0.65rem)] w-[min(100vw-1.5rem,18rem)] overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-card backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/95"
            >
              <div className="border-b border-slate-100 bg-gradient-to-br from-adapt-indigo/8 via-white to-adapt-teal/8 px-4 py-4 dark:border-gray-800 dark:from-adapt-cyan/10 dark:via-gray-900 dark:to-gray-900">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-adapt-indigo to-adapt-teal text-sm font-black text-white">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-adapt-navy dark:text-gray-100">
                      {displayName}
                    </p>
                    {email && (
                      <p className="truncate text-xs text-slate-500 dark:text-gray-400">{email}</p>
                    )}
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-adapt-indigo/10 px-2 py-0.5 text-[11px] font-bold text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
                      <GraduationCap className="h-3 w-3" aria-hidden />
                      Teacher account
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-2">
                {menuNavItems.map((item) => {
                  const active = isNavActive(location.pathname, item.to);
                  const count = notifications[item.notificationKey];
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.to}
                      type="button"
                      role="menuitem"
                      onClick={() => handleMenuNavigate(item.to)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                        active
                          ? 'bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan'
                          : 'text-slate-700 hover:bg-slate-50 dark:text-gray-200 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <Icon className="h-4 w-4" aria-hidden />
                        {item.label}
                      </span>
                      {renderCountBadge(count)}
                    </button>
                  );
                })}

                {/* <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleMenuNavigate(ROUTES.PARENT_HUB)}
                  className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <UsersRound className="h-4 w-4" aria-hidden />
                  Parent Hub
                </button> */}
              </div>

              <div className="border-t border-slate-100 p-2 dark:border-gray-800">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleSignOut()}
                  disabled={isSigningOut}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-300 dark:hover:bg-red-950/30"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  {isSigningOut ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <nav
        className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 md:hidden dark:border-gray-800"
        aria-label="Mobile teacher navigation"
      >
        {primaryNavItems.map((item) => renderNavLink(item, true))}
      </nav>
    </header>
  );
};

export default TeacherHubNav;
