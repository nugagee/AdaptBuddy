import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from 'constants/routes';
import ProtectedRoute from 'features/auth/components/ProtectedRoute';
import AuthenticatedLayout from 'layouts/AuthenticatedLayout';
import ChildOnboardedRoute from 'features/child/components/layout/ChildOnboardedRoute';
import LandingPage from 'pages/LandingPage';
import NeuroSelectorPage from 'features/child/pages/NeuroSelectorPage';
import CompanionOnboardingPage from 'features/child/pages/CompanionOnboardingPage';
import CompanionBuddyPage from 'features/child/pages/CompanionBuddyPage';
import ChildDashboardPage from 'features/child/pages/ChildDashboardPage';
import AutismSpacePage from 'features/child/pages/AutismSpacePage';
import SettingsPage from 'features/child/pages/SettingsPage';
import WritingPad from 'features/child/components/writing-pad/WritingPad';
import ParentHubPage from 'features/parent/pages/ParentHubPage';
import MusicMenu from 'features/child/components/music-menu/MusicMenu';
import TeacherLogin from 'features/teacher/components/TeacherLogin';
import TeacherDashboard from 'features/teacher/components/TeacherDashboard';
import Classes from 'features/teacher/components/Classes';
import Students from 'features/teacher/components/Students';
import Assignments from 'features/teacher/components/Assignments';
import Reports from 'features/teacher/components/Reports';
import Settings from 'features/teacher/components/Settings';
import RequireTeacherRoute from 'features/teacher/components/RequireTeacherRoute';
import LoginPage from 'pages/LoginPage';
import GuestEntryPage from 'pages/GuestEntryPage';
import SignupPage from 'pages/SignupPage';
import ForgotPasswordPage from 'pages/ForgotPasswordPage';
import AdminLoginPage from 'features/admin/pages/AdminLoginPage';
import AdminDashboardPage from 'features/admin/pages/AdminDashboardPage';
import AdminUsersPage from 'features/admin/pages/AdminUsersPage';
import AdminSettingsPage from 'features/admin/pages/AdminSettingsPage';
import RequireAdminRoute from 'features/admin/components/RequireAdminRoute';

const withAuth = (page: React.ReactNode) => (
  <ProtectedRoute>
    <AuthenticatedLayout>{page}</AuthenticatedLayout>
  </ProtectedRoute>
);

const withChildAuth = (page: React.ReactNode) =>
  withAuth(<ChildOnboardedRoute>{page}</ChildOnboardedRoute>);

const withAdmin = (page: React.ReactNode) => (
  <ProtectedRoute>
    <RequireAdminRoute>{page}</RequireAdminRoute>
  </ProtectedRoute>
);

const withTeacherAuth = (page: React.ReactNode) => (
  <ProtectedRoute>
    <RequireTeacherRoute>
      <AuthenticatedLayout>{page}</AuthenticatedLayout>
    </RequireTeacherRoute>
  </ProtectedRoute>
);

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path={ROUTES.HOME} element={<LandingPage />} />
    <Route path={ROUTES.LOGIN} element={<LoginPage />} />
    <Route path={ROUTES.GUEST_ENTRY} element={<GuestEntryPage />} />
    <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
    <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
    <Route path={ROUTES.ADMIN_LOGIN} element={<AdminLoginPage />} />
    <Route path={ROUTES.ADMIN_DASHBOARD} element={withAdmin(<AdminDashboardPage />)} />
    <Route path={ROUTES.ADMIN_USERS} element={withAdmin(<AdminUsersPage />)} />
    <Route path={ROUTES.ADMIN_SETTINGS} element={withAdmin(<AdminSettingsPage />)} />
    <Route path={ROUTES.NEURO_SELECTOR} element={withAuth(<NeuroSelectorPage />)} />
    <Route path={ROUTES.COMPANION_ONBOARDING} element={withAuth(<CompanionOnboardingPage />)} />
    <Route path={ROUTES.COMPANION_BUDDY} element={withChildAuth(<CompanionBuddyPage />)} />
    <Route path={ROUTES.CHILD_DASHBOARD} element={withChildAuth(<ChildDashboardPage />)} />
    <Route path={ROUTES.AUTISM_SPACE} element={withChildAuth(<AutismSpacePage />)} />
    <Route path={ROUTES.CHILD_SETTINGS} element={withChildAuth(<SettingsPage />)} />
    <Route path={ROUTES.WRITING_PAD} element={withChildAuth(<WritingPad />)} />
    <Route path={ROUTES.PARENT_HUB} element={withAuth(<ParentHubPage />)} />
    <Route path={ROUTES.MUSIC} element={withChildAuth(<MusicMenu />)} />
    <Route path={ROUTES.TEACHER_LOGIN} element={<AuthenticatedLayout><TeacherLogin /></AuthenticatedLayout>} />
    <Route path={ROUTES.TEACHER_DASHBOARD} element={withTeacherAuth(<TeacherDashboard />)} />
    <Route path={ROUTES.TEACHER_CLASSES} element={withTeacherAuth(<Classes />)} />
    <Route path={ROUTES.TEACHER_STUDENTS} element={withTeacherAuth(<Students />)} />
    <Route path={ROUTES.TEACHER_ASSIGNMENTS} element={withTeacherAuth(<Assignments />)} />
    <Route path={ROUTES.TEACHER_REPORTS} element={withTeacherAuth(<Reports />)} />
    <Route path={ROUTES.TEACHER_SETTINGS} element={withTeacherAuth(<Settings />)} />
    <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
  </Routes>
);

export default AppRoutes;
