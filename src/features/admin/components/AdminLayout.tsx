import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from 'hooks/useAuth';
import { ROUTES } from 'constants/routes';
import adaptbuddyLogo from 'assets/Adaptbuddy_logo.png';

const navItems = [
  { to: ROUTES.ADMIN_DASHBOARD, label: 'Overview', icon: LayoutDashboard },
  { to: ROUTES.ADMIN_USERS, label: 'Users', icon: Users },
  { to: ROUTES.ADMIN_AUDIT, label: 'Audit', icon: ShieldCheck },
  { to: ROUTES.ADMIN_SETTINGS, label: 'Platform', icon: Settings },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate(ROUTES.ADMIN_LOGIN, { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-gray-100">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-white/10 bg-slate-900/95 backdrop-blur-xl">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <img src={adaptbuddyLogo} alt="" className="h-9 w-9 rounded-xl object-contain" />
          <div>
            <p className="text-sm font-bold text-white">AdaptBuddy</p>
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-indigo-400">
              <Shield className="h-3 w-3" aria-hidden />
              Admin
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? 'bg-indigo-600/20 text-indigo-300 ring-1 ring-indigo-500/30'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="truncate text-xs font-medium text-gray-300">
            {profile?.full_name || profile?.email}
          </p>
          <p className="truncate text-[10px] text-gray-500">{profile?.email}</p>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-gray-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      <div className="ml-64 flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 px-8 py-5 backdrop-blur-xl">
          <h1 className="text-xl font-bold text-white">{title ?? 'Admin Console'}</h1>
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
