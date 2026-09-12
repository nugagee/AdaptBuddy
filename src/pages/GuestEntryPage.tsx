import React, { useEffect, useState } from 'react';
import { GraduationCap, HeartHandshake, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from 'constants/routes';
import { useAuth } from 'hooks/useAuth';
import type { UserRole } from 'services/supabase/client';

type GuestRole = Exclude<UserRole, 'admin'>;

const guestDestinations: Record<GuestRole, string> = {
  child: ROUTES.NEURO_SELECTOR,
  parent: ROUTES.PARENT_HUB,
  teacher: ROUTES.TEACHER_DASHBOARD,
};

const guestRoles: Array<{
  role: GuestRole;
  title: string;
  description: string;
  icon: typeof Sparkles;
  accent: string;
  iconStyle: string;
}> = [
  {
    role: 'child',
    title: 'Continue as a child',
    description: 'Try the calm space, learning tools and Buddy with an isolated demo profile.',
    icon: Sparkles,
    accent: 'hover:border-adapt-purple/50 hover:bg-purple-50/70 dark:hover:bg-purple-950/20',
    iconStyle: 'bg-purple-100 text-adapt-purple dark:bg-purple-950/50 dark:text-purple-200',
  },
  {
    role: 'parent',
    title: 'Continue as a parent',
    description: 'Preview the family dashboard using sample information created for guest mode.',
    icon: HeartHandshake,
    accent: 'hover:border-adapt-teal/50 hover:bg-teal-50/70 dark:hover:bg-teal-950/20',
    iconStyle: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-200',
  },
  {
    role: 'teacher',
    title: 'Continue as a teacher',
    description: 'Explore classes, assignments and support views using demonstration data.',
    icon: GraduationCap,
    accent: 'hover:border-adapt-indigo/50 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/20',
    iconStyle: 'bg-indigo-100 text-adapt-indigo dark:bg-indigo-950/50 dark:text-indigo-200',
  },
];

const parseGuestRole = (value: string | null): GuestRole | null => {
  if (value === 'child' || value === 'parent' || value === 'teacher') return value;
  return null;
};

const GuestRoleSelector: React.FC = () => (
  <main className="min-h-screen bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist px-4 py-10 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 sm:py-16">
    <div className="mx-auto max-w-4xl">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-adapt-indigo shadow-soft dark:border-gray-800 dark:bg-gray-900/80 dark:text-adapt-cyan">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          Guest preview
        </span>
        <h1 className="mt-5 text-3xl font-black text-adapt-navy dark:text-gray-100 sm:text-4xl">
          Choose a guest view
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-gray-300">
          Explore AdaptBuddy with sample data. Choose the view you want to assess; you can create
          an account later to use your own information and save your work.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {guestRoles.map(({ role, title, description, icon: Icon, accent, iconStyle }) => (
          <Link
            key={role}
            to={`${ROUTES.GUEST_ENTRY}?role=${role}`}
            className={`group flex min-h-64 flex-col rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-soft transition duration-200 hover:-translate-y-1 hover:shadow-card motion-reduce:hover:translate-y-0 dark:border-gray-800 dark:bg-gray-900/90 ${accent}`}
            aria-label={title}
          >
            <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${iconStyle}`}>
              <Icon className="h-6 w-6" aria-hidden />
            </span>
            <h2 className="mt-5 text-xl font-black text-adapt-navy dark:text-gray-100">{title}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-gray-300">
              {description}
            </p>
            <span className="mt-5 text-sm font-black text-adapt-indigo group-hover:text-adapt-purple dark:text-adapt-cyan">
              Open this demo →
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-slate-600 dark:text-gray-400">
        Already have an account?{' '}
        <Link className="font-bold text-adapt-indigo dark:text-adapt-cyan" to={ROUTES.LOGIN}>
          Sign in
        </Link>
        <span className="mx-2 text-slate-300" aria-hidden>
          |
        </span>
        <Link className="font-bold text-adapt-indigo dark:text-adapt-cyan" to={ROUTES.SIGNUP}>
          Create an account
        </Link>
      </p>
    </div>
  </main>
);

const GuestEntryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setGuestMode } = useAuth();
  const role = parseGuestRole(searchParams.get('role'));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!role) return undefined;

    let cancelled = false;

    void (async () => {
      try {
        const enteredSafely = await setGuestMode(role);
        if (cancelled) return;
        if (!enteredSafely) {
          setError('Guest mode could not safely clear the signed-in session. Please sign out and try again.');
          return;
        }
        navigate(guestDestinations[role], { replace: true });
      } catch (guestError) {
        console.error('Could not enter guest mode:', guestError);
        if (!cancelled) {
          setError('Guest mode could not safely clear the signed-in session. Please sign out and try again.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, role, setGuestMode]);

  if (!role) return <GuestRoleSelector />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist px-4 text-center dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <div className="rounded-3xl border border-white/70 bg-white/85 p-8 shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-adapt-indigo dark:text-adapt-cyan">
          Guest mode
        </p>
        <h1 className="mt-3 text-2xl font-black text-adapt-navy dark:text-gray-100">
          Opening your {role} demo...
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">
          {error || 'Securely clearing any signed-in session first…'}
        </p>
        {error && (
          <Link
            to={ROUTES.GUEST_ENTRY}
            className="mt-5 inline-flex rounded-full bg-adapt-indigo px-5 py-2.5 text-sm font-bold text-white"
          >
            Choose another guest view
          </Link>
        )}
      </div>
    </main>
  );
};

export default GuestEntryPage;
