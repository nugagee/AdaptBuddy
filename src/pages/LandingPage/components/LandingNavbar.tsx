import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { ROUTES } from 'constants/routes';
import adaptbuddyLogo from 'assets/Adaptbuddy_logo.png';
import ThemeToggle from 'components/accessibility/ThemeToggle';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'For You', href: '#roles' },
  { label: 'Analytics', href: '#analytics' },
];

const navTextLink =
  'transition-colors duration-300 ease-in-out hover:text-neuro-blue dark:hover:text-adapt-cyan sepia:hover:text-adapt-indigo';

const LandingNavbar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) closeMenu();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [closeMenu]);

  return (
    <header className="sticky top-0 z-[100] overflow-visible border-b border-white/40 bg-white/70 backdrop-blur-xl dark:border-gray-800/40 dark:bg-gray-900/80 sepia:border-amber-200/50 sepia:bg-amber-50/80">
      <div className="relative z-[100] mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to={ROUTES.HOME} className="flex items-center gap-2.5 shrink-0" onClick={closeMenu}>
          <img src={adaptbuddyLogo} alt="" className="h-9 w-9 object-contain" aria-hidden />
          <span className="text-lg font-bold text-adapt-navy dark:text-gray-100 sepia:text-amber-950">
            AdaptBuddy
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm font-medium text-slate-600 dark:text-gray-300 ${navTextLink}`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="relative z-[101] hidden items-center gap-2 sm:gap-3 md:flex">
          <ThemeToggle variant="inline" />
          <Link
            to={ROUTES.LOGIN}
            className={`text-sm font-semibold text-slate-600 dark:text-gray-300 ${navTextLink}`}
          >
            Sign in
          </Link>
          <Link
            to={ROUTES.LOGIN}
            className="inline-flex items-center gap-2 rounded-full bg-adapt-navy px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-adapt-purple sm:px-5"
          >
            Get started
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        {/* Mobile: theme + hamburger */}
        <div className="relative z-[101] flex items-center gap-2 md:hidden">
          <ThemeToggle variant="inline" />
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 text-adapt-navy shadow-soft transition hover:bg-adapt-mist dark:border-gray-700 dark:bg-gray-800/90 dark:text-gray-100"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <Menu
              className={`h-6 w-6 transition-all duration-300 ease-out ${menuOpen ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}
              aria-hidden={menuOpen}
            />
            <X
              className={`absolute h-6 w-6 transition-all duration-300 ease-out ${menuOpen ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`}
              aria-hidden={!menuOpen}
            />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <div
        id="landing-mobile-menu"
        className={`absolute left-0 right-0 top-full z-[110] overflow-hidden border-t border-white/40 bg-white/95 shadow-card backdrop-blur-xl transition-[max-height,opacity] duration-300 ease-out dark:border-gray-800/40 dark:bg-gray-900/95 sepia:border-amber-200/40 sepia:bg-amber-50/95 md:hidden ${
          menuOpen ? 'max-h-[20rem] opacity-100' : 'pointer-events-none max-h-0 opacity-0'
        }`}
        aria-hidden={!menuOpen}
      >
        <nav
          className={`mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 transition-transform duration-300 ease-out sm:px-6 ${
            menuOpen ? 'translate-y-0' : '-translate-y-2'
          }`}
          aria-label="Mobile"
        >
          {navLinks.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              onClick={closeMenu}
              className={`rounded-2xl px-3 py-3 text-base font-medium text-slate-700 hover:bg-adapt-mist dark:text-gray-200 dark:hover:bg-gray-800 ${navTextLink}`}
              style={{ transitionDelay: menuOpen ? `${i * 40}ms` : '0ms' }}
            >
              {link.label}
            </a>
          ))}

          <div className="my-2 h-px bg-slate-200/80 dark:bg-gray-700" />

          <div className="flex flex-col gap-3 px-1 py-2">
            <Link
              to={ROUTES.LOGIN}
              onClick={closeMenu}
              className={`rounded-2xl px-3 py-3 text-center text-base font-semibold text-slate-700 hover:bg-adapt-mist dark:text-gray-200 dark:hover:bg-gray-800 ${navTextLink}`}
            >
              Sign in
            </Link>
            <Link
              to={ROUTES.LOGIN}
              onClick={closeMenu}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-adapt-navy px-5 py-3.5 text-base font-semibold text-white shadow-soft transition hover:bg-adapt-purple"
            >
              Get started
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default LandingNavbar;
