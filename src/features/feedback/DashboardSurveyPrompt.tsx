import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from 'hooks/useAuth';
import { ROUTES } from 'constants/routes';
import ExperienceSurveyModal from 'features/feedback/ExperienceSurveyModal';
import {
  EXPERIENCE_SURVEY_DELAY_MS,
  markSurveySnoozed,
  shouldOfferExperienceSurvey,
  surveyStorageId,
} from 'features/feedback/experienceSurvey';
import { getVisitorKey } from 'services/analytics/activityTracker';

const DASHBOARD_PATHS = new Set<string>([
  ROUTES.CHILD_DASHBOARD,
  ROUTES.PARENT_HUB,
  ROUTES.TEACHER_DASHBOARD,
]);

/**
 * Softly invites child/parent/teacher users (including guests) to share experience feedback
 * after they have settled on their dashboard for a few minutes.
 */
const DashboardSurveyPrompt: React.FC = () => {
  const location = useLocation();
  const { profile, isGuest, loading, initialized } = useAuth();
  const [open, setOpen] = useState(false);
  const visitorKey = useMemo(() => getVisitorKey(), []);

  const onDashboard = DASHBOARD_PATHS.has(location.pathname);
  const eligible = useMemo(
    () => shouldOfferExperienceSurvey(profile, isGuest, visitorKey),
    [profile, isGuest, visitorKey],
  );

  useEffect(() => {
    if (!initialized || loading || !onDashboard || !eligible || !profile || open) return undefined;

    const timer = window.setTimeout(() => {
      if (shouldOfferExperienceSurvey(profile, isGuest, visitorKey)) {
        setOpen(true);
      }
    }, EXPERIENCE_SURVEY_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [initialized, loading, onDashboard, eligible, profile, isGuest, visitorKey, open, location.pathname]);

  if (!profile) return null;

  return (
    <ExperienceSurveyModal
      open={open}
      onClose={(reason) => {
        if (reason === 'snoozed' || reason === 'dismissed') {
          markSurveySnoozed(surveyStorageId(profile, isGuest, visitorKey));
        }
        setOpen(false);
      }}
    />
  );
};

export default DashboardSurveyPrompt;
