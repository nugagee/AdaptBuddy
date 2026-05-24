import React, { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layers, Rocket } from 'lucide-react';
import ChildDashboardNavbar from 'features/child/components/layout/ChildDashboardNavbar';
import FeelingsJournal from 'features/child/components/journal/FeelingsJournal';
import DashboardHero from 'features/child/components/dashboard/DashboardHero';
import DailyOrbitProgress from 'features/child/components/dashboard/DailyOrbitProgress';
import NeuroZoneCard from 'features/child/components/dashboard/NeuroZoneCard';
import MetricsConstellation from 'features/child/components/dashboard/MetricsConstellation';
import AccessibilityDock from 'features/child/components/dashboard/AccessibilityDock';
import SmartRecommendationsPanel from 'features/child/components/dashboard/SmartRecommendationsPanel';
import FocusTimerModal from 'features/child/components/dashboard/FocusTimerModal';
import ActivitySessionModal from 'features/child/components/dashboard/ActivitySessionModal';
import AuthSuccessBanner from 'components/auth/AuthSuccessBanner';
import {
  getActivitiesForNeuros,
  getDailyActivitiesForNeuro,
  type NeuroActivity,
} from 'features/child/data/neuroDashboardContent';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { useAuth } from 'hooks/useAuth';
import { ROUTES } from 'constants/routes';
import '../components/dashboard/child-dashboard.css';

const ChildDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  const [showJournal, setShowJournal] = useState(false);
  const [activeActivity, setActiveActivity] = useState<NeuroActivity | null>(null);
  const [showFocusTimer, setShowFocusTimer] = useState(false);
  const [celebration, setCelebration] = useState<string | null>(null);

  const completeActivity = useChildProgressStore((s) => s.completeActivity);
  const setTodayMood = useChildProgressStore((s) => s.setTodayMood);
  const completions = useChildProgressStore((s) => s.completions);

  const firstName = profile?.first_name || 'Friend';
  const neuroTypes = profile?.neuro_types?.length ? profile.neuro_types : ['autism', 'adhd'];
  const dailyActivities = useMemo(() => getActivitiesForNeuros(neuroTypes), [neuroTypes]);
  const welcomeMessage = (location.state as { message?: string } | null)?.message;

  const today = new Date().toISOString().slice(0, 10);
  const todayCompletedCount = completions.filter((c) => c.completedAt.startsWith(today)).length;
  const todayProgress =
    dailyActivities.length > 0
      ? Math.min(100, Math.round((todayCompletedCount / dailyActivities.length) * 100))
      : 0;

  const handleStartActivity = useCallback(
    (activity: NeuroActivity) => {
      if (activity.action === 'journal') {
        setShowJournal(true);
        return;
      }
      if (activity.action === 'focus-timer') {
        setShowFocusTimer(true);
        return;
      }
      if (activity.route) {
        navigate(activity.route);
        return;
      }
      if (activity.action === 'music') {
        navigate(ROUTES.MUSIC);
        return;
      }
      if (activity.action === 'writing') {
        navigate(ROUTES.WRITING_PAD);
        return;
      }
      setActiveActivity(activity);
    },
    [navigate],
  );

  const handleActivityComplete = useCallback(() => {
    if (!activeActivity) return;
    completeActivity(
      activeActivity.id,
      activeActivity.neuroId,
      activeActivity.starsReward,
      activeActivity.durationMinutes,
    );
    setCelebration(`+${activeActivity.starsReward} stars! Great job on "${activeActivity.title}"`);
    setActiveActivity(null);
    window.setTimeout(() => setCelebration(null), 4000);
  }, [activeActivity, completeActivity]);

  const handleFocusComplete = useCallback(() => {
    completeActivity('adhd-focus-sprint', 'adhd', 5, 12);
    setShowFocusTimer(false);
    setCelebration('Focus sprint complete! +5 stars');
    window.setTimeout(() => setCelebration(null), 4000);
  }, [completeActivity]);

  const handleJournalClose = useCallback(() => {
    setShowJournal(false);
    const moodActivity = dailyActivities.find((a) => a.action === 'journal');
    if (moodActivity && !useChildProgressStore.getState().isActivityCompletedToday(moodActivity.id)) {
      completeActivity(moodActivity.id, moodActivity.neuroId, moodActivity.starsReward, moodActivity.durationMinutes);
    }
  }, [dailyActivities, completeActivity]);

  const handleRecommendation = useCallback(
    (_id: string, title: string) => {
      setCelebration(`"${title}" is queued for your next session!`);
      window.setTimeout(() => setCelebration(null), 3000);
    },
    [],
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <ChildDashboardNavbar />

      {welcomeMessage && <AuthSuccessBanner />}

      {celebration && (
        <div
          className="fixed top-20 left-1/2 z-50 -translate-x-1/2 animate-slide-up rounded-2xl bg-gradient-to-r from-adapt-indigo to-adapt-teal px-6 py-3 text-sm font-bold text-white shadow-glow"
          role="status"
        >
          {celebration}
        </div>
      )}

      <main className="mx-auto max-w-6xl space-y-6 p-4 pb-16 sm:p-6 sm:pb-20">
        <DashboardHero
          firstName={firstName}
          neuroTypes={neuroTypes}
          todayProgress={todayProgress}
        />

        <DailyOrbitProgress
          totalActivities={dailyActivities.length}
          onMoodCheck={() => setShowJournal(true)}
        />

        <section>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-adapt-indigo/10">
              <Rocket className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-bold text-adapt-navy dark:text-gray-100">
                Your Neuro Zones
              </h2>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                Daily missions tailored to each profile you selected
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {neuroTypes.map((neuroId) => (
              <NeuroZoneCard
                key={neuroId}
                neuroId={neuroId}
                activities={getDailyActivitiesForNeuro(neuroId)}
                onStartActivity={handleStartActivity}
              />
            ))}
          </div>
        </section>

        <MetricsConstellation neuroTypes={neuroTypes} />

        <AccessibilityDock neuroTypes={neuroTypes} />

        <SmartRecommendationsPanel
          neuroTypes={neuroTypes}
          onTryRecommendation={handleRecommendation}
        />

        <section className="rounded-3xl border border-dashed border-adapt-indigo/25 bg-adapt-indigo/5 p-6 text-center dark:border-adapt-cyan/25 dark:bg-adapt-cyan/5">
          <Layers className="mx-auto mb-2 h-8 w-8 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
          <p className="text-sm font-medium text-slate-600 dark:text-gray-400">
            Your dashboard reshapes every day based on mood, progress, and neuro profile —
            inspired by UDL, Lexy, Vedyx, and AAC best practices.
          </p>
        </section>
      </main>

      {showJournal && (
        <FeelingsJournal
          onClose={handleJournalClose}
          onSave={(mood) => setTodayMood(mood)}
        />
      )}

      {activeActivity && (
        <ActivitySessionModal
          activity={activeActivity}
          onClose={() => setActiveActivity(null)}
          onComplete={handleActivityComplete}
        />
      )}

      {showFocusTimer && (
        <FocusTimerModal
          durationMinutes={12}
          onClose={() => setShowFocusTimer(false)}
          onComplete={handleFocusComplete}
        />
      )}
    </div>
  );
};

export default ChildDashboardPage;
