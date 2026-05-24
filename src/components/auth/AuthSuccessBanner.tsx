import React, { useEffect } from 'react';
import { Check } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const AuthSuccessBanner: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const message = (location.state as { message?: string } | null)?.message;

  useEffect(() => {
    if (!message) return undefined;

    const timer = window.setTimeout(() => {
      navigate(location.pathname, { replace: true, state: {} });
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [message, location.pathname, navigate]);

  if (!message) return null;

  return (
    <div
      className="fixed left-1/2 top-4 z-[110] flex w-[min(100%-2rem,28rem)] -translate-x-1/2 items-center gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/95 px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg backdrop-blur-sm dark:border-emerald-800/60 dark:bg-emerald-950/90 dark:text-emerald-300"
      role="status"
      aria-live="polite"
    >
      <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
      {message}
    </div>
  );
};

export default AuthSuccessBanner;
