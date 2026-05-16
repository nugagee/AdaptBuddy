import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ROUTES } from 'constants/routes';
import adaptbuddyLogo from 'assets/Adaptbuddy_logo.png';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'For You', href: '#roles' },
  { label: 'Analytics', href: '#analytics' },
];

const LandingNavbar: React.FC = () => (
  <header className="sticky top-0 z-50 border-b border-white/40 bg-white/70 backdrop-blur-xl">
    <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
      <Link to={ROUTES.HOME} className="flex items-center gap-2.5 shrink-0">
        <img src={adaptbuddyLogo} alt="" className="h-9 w-9 object-contain" aria-hidden />
        <span className="text-lg font-bold text-adapt-navy">AdaptBuddy</span>
      </Link>

      <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-sm font-medium text-slate-600 transition hover:text-adapt-navy"
          >
            {link.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-3 sm:gap-4">
        <Link
          to={ROUTES.LOGIN}
          className="text-sm font-semibold text-slate-600 transition hover:text-adapt-navy"
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
    </div>
  </header>
);

export default LandingNavbar;
