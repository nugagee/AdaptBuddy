import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  bindAnalyticsLifecycle,
  trackPageView,
} from 'services/analytics/activityTracker';

/**
 * First-party activity tracker: route changes, active time, and session heartbeats.
 * Does not capture form fields or private content — paths and durations only.
 */
const ActivityTracker: React.FC = () => {
  const location = useLocation();

  useEffect(() => bindAnalyticsLifecycle(), []);

  useEffect(() => {
    void trackPageView(location.pathname, document.title);
  }, [location.pathname]);

  return null;
};

export default ActivityTracker;
