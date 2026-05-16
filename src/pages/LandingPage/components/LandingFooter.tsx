import React from 'react';

const footerLinks = [
  { label: 'Privacy', href: '#' },
  // { label: 'Privacy', href: '#' },
  { label: 'Accessibility', href: '#features' },
  { label: 'Contact', href: '#' },
];

const LandingFooter: React.FC = () => (
  <footer className="border-t border-slate-200/80 bg-white/60 py-10 backdrop-blur-sm">
    <>
      <span className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8 block">
        <p className="text-sm text-slate-500">© {new Date().getFullYear()} AdaptBuddy — built with care.</p>
        <nav className="flex flex-wrap items-center justify-center gap-6" aria-label="Footer">
          {footerLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition hover:text-adapt-navy"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </span>
    </>
  </footer>
);

export default LandingFooter;
