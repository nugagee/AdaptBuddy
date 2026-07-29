import React, { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layers, Mic2, Rocket, Sparkles, Volume2 } from 'lucide-react';
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
import ChildClassroomPanel from 'features/child/components/dashboard/ChildClassroomPanel';
import TeacherAssignmentsPanel from 'features/child/components/dashboard/TeacherAssignmentsPanel';
import NowNextLaterBoard from 'features/child/components/NowNextLaterBoard';
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
  const childId = profile?.id ?? 'guest-child';
  const neuroTypes = useMemo(
    () => (profile?.neuro_types?.length ? profile.neuro_types : ['autism']),
    [profile?.neuro_types],
  );
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
          onMoodCheck={() => navigate(ROUTES.COMPANION_BUDDY)}
        />

        {neuroTypes.includes('autism') && (
          <NowNextLaterBoard
            childId={childId}
            mode="child"
            compact
            onActivityComplete={(activity) => {
              setCelebration(`${activity.emoji} ${activity.label} complete! Great transition.`);
              window.setTimeout(() => setCelebration(null), 3500);
            }}
          />
        )}

        <ChildClassroomPanel childId={childId} />

        <TeacherAssignmentsPanel
          childId={childId}
          onCelebrate={(message) => {
            setCelebration(message);
            window.setTimeout(() => setCelebration(null), 3500);
          }}
        />

        <section className="overflow-hidden rounded-3xl border border-adapt-indigo/20 bg-gradient-to-br from-adapt-indigo/10 via-white to-adapt-purple/10 p-6 shadow-sm dark:border-adapt-cyan/20 dark:from-adapt-cyan/10 dark:via-gray-900 dark:to-adapt-purple/10 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-adapt-indigo/15 text-adapt-indigo dark:bg-adapt-cyan/15 dark:text-adapt-cyan">
                <Sparkles className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">
                  Your AI companion
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
                  Simplify confusing words, check in on your mood, or create a social story —
                  AdaptBuddy understands you.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(ROUTES.COMPANION_BUDDY)}
              className="shrink-0 rounded-2xl bg-adapt-indigo px-5 py-3 text-sm font-semibold text-white hover:bg-adapt-purple dark:bg-adapt-cyan dark:text-gray-900"
            >
              Open AdaptBuddy
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-adapt-teal/25 bg-gradient-to-br from-white via-adapt-teal/10 to-adapt-indigo/10 p-6 shadow-sm dark:border-adapt-cyan/20 dark:from-gray-900 dark:via-adapt-cyan/10 dark:to-adapt-indigo/15 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-adapt-teal/15 text-adapt-teal dark:bg-adapt-cyan/15 dark:text-adapt-cyan">
                <Mic2 className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">
                    Pronunciation Buddy
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-adapt-indigo shadow-sm dark:bg-gray-950/70 dark:text-adapt-cyan">
                    <Volume2 className="h-3.5 w-3.5" aria-hidden />
                    Listen & repeat
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
                  Practise letters, names, classroom words, and helpful sentences with calm
                  read-aloud and microphone feedback.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(ROUTES.PRONUNCIATION_BUDDY)}
              className="shrink-0 rounded-2xl bg-adapt-teal px-5 py-3 text-sm font-semibold text-white hover:bg-adapt-indigo dark:bg-adapt-cyan dark:text-gray-900"
            >
              Start speaking
            </button>
          </div>
        </section>

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
