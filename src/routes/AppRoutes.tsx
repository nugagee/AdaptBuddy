import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from 'constants/routes';
import ProtectedRoute from 'features/auth/components/ProtectedRoute';
import AuthenticatedLayout from 'layouts/AuthenticatedLayout';
import ChildOnboardedRoute from 'features/child/components/layout/ChildOnboardedRoute';
import LandingPage from 'pages/LandingPage';
import NeuroSelectorPage from 'features/child/pages/NeuroSelectorPage';
import ChildDashboardPage from 'features/child/pages/ChildDashboardPage';
import SettingsPage from 'features/child/pages/SettingsPage';
import WritingPad from 'features/child/components/writing-pad/WritingPad';
import ParentHubPage from 'features/parent/pages/ParentHubPage';
import MusicMenu from 'features/child/components/music-menu/MusicMenu';
import TeacherLogin from 'features/teacher/components/TeacherLogin';
import TeacherDashboard from 'features/teacher/components/TeacherDashboard';
import Classes from 'features/teacher/components/Classes';
import Students from 'features/teacher/components/Students';
import Reports from 'features/teacher/components/Reports';
import Settings from 'features/teacher/components/Settings';
import LoginPage from 'pages/LoginPage';
import SignupPage from 'pages/SignupPage';

const withAuth = (page: React.ReactNode) => (
  <ProtectedRoute>
    <AuthenticatedLayout>{page}</AuthenticatedLayout>
  </ProtectedRoute>
);

const withChildAuth = (page: React.ReactNode) =>
  withAuth(<ChildOnboardedRoute>{page}</ChildOnboardedRoute>);

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path={ROUTES.HOME} element={<LandingPage />} />
    <Route path={ROUTES.LOGIN} element={<LoginPage />} />
    <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
    <Route path={ROUTES.NEURO_SELECTOR} element={withAuth(<NeuroSelectorPage />)} />
    <Route path={ROUTES.CHILD_DASHBOARD} element={withChildAuth(<ChildDashboardPage />)} />
    <Route path={ROUTES.CHILD_SETTINGS} element={withChildAuth(<SettingsPage />)} />
    <Route path={ROUTES.WRITING_PAD} element={withChildAuth(<WritingPad />)} />
    <Route path={ROUTES.PARENT_HUB} element={withAuth(<ParentHubPage />)} />
    <Route path={ROUTES.MUSIC} element={withChildAuth(<MusicMenu />)} />
    <Route path={ROUTES.TEACHER_LOGIN} element={<AuthenticatedLayout><TeacherLogin /></AuthenticatedLayout>} />
    <Route path={ROUTES.TEACHER_DASHBOARD} element={<AuthenticatedLayout><TeacherDashboard /></AuthenticatedLayout>} />
    <Route path={ROUTES.TEACHER_CLASSES} element={<AuthenticatedLayout><Classes /></AuthenticatedLayout>} />
    <Route path={ROUTES.TEACHER_STUDENTS} element={<AuthenticatedLayout><Students /></AuthenticatedLayout>} />
    <Route path={ROUTES.TEACHER_REPORTS} element={<AuthenticatedLayout><Reports /></AuthenticatedLayout>} />
    <Route path={ROUTES.TEACHER_SETTINGS} element={<AuthenticatedLayout><Settings /></AuthenticatedLayout>} />
    <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
  </Routes>
);

export default AppRoutes;
