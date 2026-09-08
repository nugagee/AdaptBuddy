import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from 'constants/routes';

const footerLinks = [
  { label: 'Privacy & safety', href: `${ROUTES.TRUST_AND_SAFETY}#privacy` },
  { label: 'Accessibility', href: `${ROUTES.TRUST_AND_SAFETY}#accessibility` },
  { label: 'Product evidence', href: ROUTES.EVIDENCE },
];

const LandingFooter: React.FC = () => (
  <footer className="border-t border-slate-200/80 bg-white/60 py-10 backdrop-blur-sm">
    <>
      <span className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8 block">
        <p className="text-sm text-slate-500">© {new Date().getFullYear()} AdaptBuddy — built with care.</p>
        <nav className="flex flex-wrap items-center justify-center gap-6" aria-label="Footer">
          {footerLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="text-sm font-medium text-slate-600 transition hover:text-adapt-navy"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </span>
    </>
  </footer>
);

export default LandingFooter;
