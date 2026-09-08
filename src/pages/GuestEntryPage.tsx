import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from 'constants/routes';
import { useAuth } from 'hooks/useAuth';
import type { UserRole } from 'services/supabase/client';

type GuestRole = Exclude<UserRole, 'admin'>;

const guestDestinations: Record<GuestRole, string> = {
  child: ROUTES.NEURO_SELECTOR,
  parent: ROUTES.PARENT_HUB,
  teacher: ROUTES.TEACHER_DASHBOARD,
};

const toGuestRole = (value: string | null): GuestRole => {
  if (value === 'parent' || value === 'teacher') return value;
  return 'child';
};

const GuestEntryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setGuestMode } = useAuth();
  const role = toGuestRole(searchParams.get('role'));
  const [error, setError] = useState('');

  useEffect(() => {
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

  if (!guestDestinations[role]) return <Navigate to={ROUTES.HOME} replace />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist px-4 text-center dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <div className="rounded-3xl border border-white/70 bg-white/85 p-8 shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-adapt-indigo dark:text-adapt-cyan">
          Guest mode
        </p>
        <h1 className="mt-3 text-2xl font-black text-adapt-navy dark:text-gray-100">
          Opening your demo space...
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">
          {error || 'Securely clearing any signed-in session first…'}
        </p>
      </div>
    </main>
  );
};

export default GuestEntryPage;
