import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  FileBarChart,
  GraduationCap,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  School,
  Search,
  Settings,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import { ROUTES } from 'constants/routes';
import { useAuth } from 'hooks/useAuth';
import { TeacherDashboardService } from 'features/teacher/services/teacherDashboardService';
import adaptbuddyLogo from 'assets/Adaptbuddy_logo.png';

/** Tailwind needs this literal in-source for JIT; applied to page wrappers. */
const SIDEBAR_OFFSET_CLASS = 'lg:pl-[18.5rem]';
const SIDEBAR_OFFSET_COLLAPSED_CLASS = 'lg:pl-[5.25rem]';

interface TeacherNavNotifications {
  signals: number;
  messages: number;
  reports: number;
  settings: number;
}

type NavSectionId = 'workspace' | 'care' | 'insights' | 'account';

interface SearchableNavItem {
  id: string;
  to: string;
  label: string;
  description: string;
  keywords: string[];
  section: NavSectionId;
  icon: typeof LayoutDashboard;
  notificationKey?: keyof TeacherNavNotifications;
}

const SECTION_LABELS: Record<NavSectionId, string> = {
  workspace: 'Workspace',
  care: 'Care & families',
  insights: 'Insights',
  account: 'Account',
};

const NAV_ITEMS: SearchableNavItem[] = [
  {
    id: 'dashboard',
    to: ROUTES.TEACHER_DASHBOARD,
    label: 'Dashboard',
    description: 'Overview, requests, and today at a glance',
    keywords: ['home', 'overview', 'summary', 'requests', 'meetings'],
    section: 'workspace',
    icon: LayoutDashboard,
  },
  {
    id: 'classes',
    to: ROUTES.TEACHER_CLASSES,
    label: 'Classes',
    description: 'Create classes, codes, and launch live rooms',
    keywords: ['classroom', 'live', 'launch', 'class code', 'buddy id', 'session'],
    section: 'workspace',
    icon: School,
  },
  {
    id: 'students',
    to: ROUTES.TEACHER_STUDENTS,
    label: 'Students',
    description: 'Learner roster and membership status',
    keywords: ['learners', 'roster', 'children', 'membership', 'pupils'],
    section: 'workspace',
    icon: Users,
  },
  {
    id: 'assignments',
    to: ROUTES.TEACHER_ASSIGNMENTS,
    label: 'Assignments',
    description: 'Tasks, due dates, and classroom work',
    keywords: ['homework', 'tasks', 'due', 'work', 'set work'],
    section: 'workspace',
    icon: ClipboardList,
  },
  {
    id: 'activity',
    to: ROUTES.TEACHER_ACTIVITY_LOG,
    label: 'Activity log',
    description: 'Past classrooms and attendance audit trail',
    keywords: ['audit', 'history', 'past classes', 'attendance', 'export', 'csv', 'sessions'],
    section: 'workspace',
    icon: History,
  },
  {
    id: 'signals',
    to: ROUTES.TEACHER_SIGNALS,
    label: 'Signals',
    description: 'Support alerts and safeguarding cues',
    keywords: ['alerts', 'support', 'safeguarding', 'flags', 'wellbeing'],
    section: 'care',
    icon: ShieldAlert,
    notificationKey: 'signals',
  },
  {
    id: 'messages',
    to: ROUTES.TEACHER_MESSAGES,
    label: 'Messages',
    description: 'Family and care communications',
    keywords: ['chat', 'inbox', 'parents', 'families', 'replies'],
    section: 'care',
    icon: MessageSquare,
    notificationKey: 'messages',
  },
  {
    id: 'reports',
    to: ROUTES.TEACHER_REPORTS,
    label: 'Reports',
    description: 'Progress packs, digests, and evidence',
    keywords: ['progress', 'digest', 'evidence', 'export', 'print', 'weekly'],
    section: 'insights',
    icon: FileBarChart,
    notificationKey: 'reports',
  },
  {
    id: 'settings',
    to: ROUTES.TEACHER_SETTINGS,
    label: 'Settings',
    description: 'Profile, preferences, and account controls',
    keywords: ['profile', 'preferences', 'account', 'notifications', 'theme'],
    section: 'account',
    icon: Settings,
    notificationKey: 'settings',
  },
];

const emptyNotifications: TeacherNavNotifications = {
  signals: 0,
  messages: 0,
  reports: 0,
  settings: 0,
};

const isNavActive = (pathname: string, to: string): boolean =>
  pathname === to || (to !== ROUTES.TEACHER_DASHBOARD && pathname.startsWith(`${to}/`));

const matchesQuery = (item: SearchableNavItem, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    item.label,
    item.description,
    item.section,
    SECTION_LABELS[item.section],
    ...item.keywords,
  ]
    .join(' ')
    .toLowerCase();
  return q.split(/\s+/).every((token) => haystack.includes(token));
};

const TeacherHubNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user, isGuest, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [notifications, setNotifications] = useState<TeacherNavNotifications>(emptyNotifications);
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    profile?.full_name ||
    user?.email?.split('@')[0] ||
    'Teacher';

  const email = profile?.email || user?.email || '';
  const initials = displayName.trim().charAt(0).toUpperCase() || 'T';
  const avatarUrl = profile?.avatar_url;

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

  useLayoutEffect(() => {
    let parent: HTMLElement | null = hostRef.current?.parentElement ?? null;
    while (parent && !parent.classList.contains('min-h-screen')) {
      parent = parent.parentElement ?? null;
    }
    if (!parent) {
      parent = hostRef.current?.parentElement ?? null;
    }
    if (!parent) return undefined;

    const offsetTarget = parent;
    const offsetClass = collapsed ? SIDEBAR_OFFSET_COLLAPSED_CLASS : SIDEBAR_OFFSET_CLASS;
    offsetTarget.classList.remove(SIDEBAR_OFFSET_CLASS, SIDEBAR_OFFSET_COLLAPSED_CLASS);
    offsetTarget.classList.add(offsetClass);
    return () => {
      offsetTarget.classList.remove(SIDEBAR_OFFSET_CLASS, SIDEBAR_OFFSET_COLLAPSED_CLASS);
    };
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
    setQuery('');
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setMobileOpen(true);
        setCollapsed(false);
        window.setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (event.key === 'Escape') {
        setMobileOpen(false);
        setQuery('');
        searchRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const filteredItems = useMemo(
    () => NAV_ITEMS.filter((item) => matchesQuery(item, query)),
    [query],
  );

  const groupedItems = useMemo(() => {
    const order: NavSectionId[] = ['workspace', 'care', 'insights', 'account'];
    return order
      .map((section) => ({
        section,
        items: filteredItems.filter((item) => item.section === section),
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredItems]);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
      navigate(ROUTES.TEACHER_LOGIN, { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleNavigate = (to: string) => {
    setMobileOpen(false);
    setQuery('');
    navigate(to);
  };

  const renderCountBadge = (count: number) => {
    if (count <= 0) return null;
    return (
      <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">
        {count > 99 ? '99+' : count}
      </span>
    );
  };

  const sidebarInner = (compact: boolean) => (
    <div className="relative flex h-full flex-col">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-adapt-teal/20 blur-3xl" />
        <div className="absolute -right-8 bottom-24 h-48 w-48 rounded-full bg-adapt-indigo/25 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)',
            backgroundSize: '18px 18px',
          }}
        />
      </div>

      <div className="relative border-b border-white/10 px-4 py-5">
        <div className="flex items-center gap-3">
          <Link
            to={ROUTES.TEACHER_DASHBOARD}
            className="flex min-w-0 flex-1 items-center gap-3"
            onClick={() => setMobileOpen(false)}
          >
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/20">
              <img src={adaptbuddyLogo} alt="" className="h-8 w-8 object-contain" />
            </span>
            {!compact && (
              <div className="min-w-0">
                <p className="truncate text-sm font-black tracking-tight text-white">AdaptBuddy</p>
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-adapt-cyan/90">
                  Teacher Hub
                </p>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="hidden h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/80 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white lg:inline-flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" aria-hidden />
            ) : (
              <PanelLeftClose className="h-4 w-4" aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/80 ring-1 ring-white/10 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {!compact && (
          <label className="relative mt-4 block">
            <span className="sr-only">Search teacher hub menus</span>
            <Search
              className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition ${
                searchFocused ? 'text-adapt-cyan' : 'text-white/45'
              }`}
              aria-hidden
            />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search menus…"
              className="w-full rounded-2xl border border-white/10 bg-white/8 py-2.5 pl-10 pr-16 text-sm font-semibold text-white placeholder:text-white/40 outline-none ring-adapt-cyan/40 transition focus:border-adapt-cyan/40 focus:bg-white/12 focus:ring-2"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-lg border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-white/50 sm:inline">
              ⌘K
            </kbd>
          </label>
        )}

        {compact && (
          <button
            type="button"
            onClick={() => {
              setCollapsed(false);
              window.setTimeout(() => searchRef.current?.focus(), 80);
            }}
            className="mt-4 flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/8 py-2.5 text-white/70 transition hover:bg-white/12 hover:text-white"
            aria-label="Search menus"
          >
            <Search className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      <nav
        className="relative flex-1 space-y-5 overflow-y-auto px-3 py-4"
        aria-label="Teacher hub navigation"
      >
        {groupedItems.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-center">
            <p className="text-sm font-bold text-white">No matches</p>
            {!compact && (
              <p className="mt-1 text-xs text-white/55">
                Try “live”, “audit”, “messages”, or “settings”.
              </p>
            )}
          </div>
        )}

        {groupedItems.map((group) => (
          <div key={group.section}>
            {!compact && (
              <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                {SECTION_LABELS[group.section]}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = isNavActive(location.pathname, item.to);
                const Icon = item.icon;
                const count = item.notificationKey ? notifications[item.notificationKey] : 0;

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleNavigate(item.to)}
                      title={compact ? item.label : undefined}
                      className={`group relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                        active
                          ? 'bg-white text-adapt-navy shadow-lg shadow-black/10'
                          : 'text-white/75 hover:bg-white/8 hover:text-white'
                      } ${compact ? 'justify-center px-2' : ''}`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                          active
                            ? 'bg-adapt-navy text-white'
                            : 'bg-white/8 text-white/80 group-hover:bg-white/12'
                        }`}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      {!compact && (
                        <>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-bold">{item.label}</span>
                              {renderCountBadge(count)}
                            </span>
                            {(query.trim() || active) && (
                              <span
                                className={`mt-0.5 block truncate text-[11px] font-medium ${
                                  active ? 'text-adapt-navy/60' : 'text-white/45'
                                }`}
                              >
                                {item.description}
                              </span>
                            )}
                          </span>
                        </>
                      )}
                      {compact && count > 0 && (
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="relative border-t border-white/10 p-3">
        <div
          className={`mb-3 rounded-2xl border border-white/10 bg-white/5 p-3 ${
            compact ? 'flex justify-center' : ''
          }`}
        >
          <div className={`flex items-center gap-3 ${compact ? '' : ''}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-adapt-teal to-adapt-indigo text-sm font-black text-white">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </span>
            {!compact && (
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">{displayName}</p>
                {email && <p className="truncate text-[11px] text-white/50">{email}</p>}
                <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-adapt-cyan/15 px-2 py-0.5 text-[10px] font-bold text-adapt-cyan">
                  <GraduationCap className="h-3 w-3" aria-hidden />
                  Teacher
                </p>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={isSigningOut}
          className={`flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-bold text-rose-200 transition hover:bg-rose-500/15 disabled:opacity-60 ${
            compact ? 'justify-center' : ''
          }`}
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {!compact && (isSigningOut ? 'Signing out…' : 'Sign out')}
        </button>
      </div>
    </div>
  );

  return (
    <div ref={hostRef} className="contents">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-white/60 bg-white/85 px-3 py-2.5 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/90 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-adapt-navy dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          aria-label="Open teacher hub menu"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <Link to={ROUTES.TEACHER_DASHBOARD} className="flex min-w-0 items-center gap-2">
          <img src={adaptbuddyLogo} alt="" className="h-8 w-8 rounded-xl object-contain" />
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-adapt-navy dark:text-gray-100">Teacher Hub</p>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => {
            setMobileOpen(true);
            window.setTimeout(() => searchRef.current?.focus(), 80);
          }}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-adapt-navy dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          aria-label="Search menus"
        >
          <Search className="h-4 w-4" aria-hidden />
        </button>
      </header>

      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#1f1a3d] via-adapt-navy to-[#17132e] text-white shadow-[8px_0_40px_-20px_rgba(45,38,84,0.55)] transition-all duration-300 lg:flex ${
          collapsed ? 'w-[5.25rem]' : 'w-[18.5rem]'
        }`}
      >
        {sidebarInner(collapsed)}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-adapt-navy/50 backdrop-blur-sm"
            aria-label="Close menu overlay"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(100vw-2.5rem,20rem)] flex-col overflow-hidden bg-gradient-to-b from-[#1f1a3d] via-adapt-navy to-[#17132e] text-white shadow-2xl animate-slide-in">
            {sidebarInner(false)}
          </aside>
        </div>
      )}
    </div>
  );
};

export default TeacherHubNav;
