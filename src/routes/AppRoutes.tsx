import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from 'constants/routes';
import ProtectedRoute from 'features/auth/components/ProtectedRoute';
import AuthenticatedLayout from 'layouts/AuthenticatedLayout';
import LandingPage from 'pages/LandingPage';
import NeuroSelector from 'features/child/components/neuro-selector/NeuroSelector';
import ChildDashboardPage from 'features/child/pages/ChildDashboardPage';
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

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path={ROUTES.HOME} element={<LandingPage />} />
    <Route path={ROUTES.LOGIN} element={<LoginPage />} />
    <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
    <Route
      path={ROUTES.NEURO_SELECTOR}
      element={withAuth(<NeuroSelector onContinue={() => {}} />)}
    />
    <Route path={ROUTES.CHILD_DASHBOARD} element={withAuth(<ChildDashboardPage />)} />
    <Route path={ROUTES.WRITING_PAD} element={withAuth(<WritingPad />)} />
    <Route path={ROUTES.PARENT_HUB} element={withAuth(<ParentHubPage />)} />
    <Route path={ROUTES.MUSIC} element={withAuth(<MusicMenu />)} />
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
