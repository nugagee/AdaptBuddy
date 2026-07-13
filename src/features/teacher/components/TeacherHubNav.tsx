import React from 'react';
import { NavLink } from 'react-router-dom';
import { ROUTES } from 'constants/routes';

const navItems = [
  { to: ROUTES.TEACHER_DASHBOARD, label: 'Dashboard' },
  { to: ROUTES.TEACHER_CLASSES, label: 'Classes' },
  { to: ROUTES.TEACHER_STUDENTS, label: 'Students' },
  { to: ROUTES.TEACHER_ASSIGNMENTS, label: 'Assignments' },
  { to: ROUTES.TEACHER_REPORTS, label: 'Reports' },
  { to: ROUTES.TEACHER_SETTINGS, label: 'Settings' },
];

const TeacherHubNav: React.FC = () => (
  <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Teacher navigation">
    {navItems.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        className={({ isActive }) =>
          `shrink-0 rounded-2xl px-4 py-2 text-sm font-black transition ${
            isActive
              ? 'bg-adapt-navy text-white shadow-soft dark:bg-adapt-cyan dark:text-gray-950'
              : 'border border-slate-200 bg-white text-slate-600 hover:border-adapt-indigo/40 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300'
          }`
        }
      >
        {item.label}
      </NavLink>
    ))}
  </nav>
);

export default TeacherHubNav;
