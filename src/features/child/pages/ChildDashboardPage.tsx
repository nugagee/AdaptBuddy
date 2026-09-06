import React, { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Hand, Heart, Mic2, Settings2, Sparkles } from 'lucide-react';
import ChildDashboardNavbar from 'features/child/components/layout/ChildDashboardNavbar';
import FeelingsJournal from 'features/child/components/journal/FeelingsJournal';
import DashboardHero from 'features/child/components/dashboard/DashboardHero';
import DailyOrbitProgress from 'features/child/components/dashboard/DailyOrbitProgress';
import NeuroZoneCard from 'features/child/components/dashboard/NeuroZoneCard';
import MetricsConstellation from 'features/child/components/dashboard/MetricsConstellation';
import AccessibilityDock from 'features/child/components/dashboard/AccessibilityDock';
import SmartRecommendationsPanel from 'features/child/components/dashboard/SmartRecommendationsPanel';
import FocusTimerModal from 'features/child/components/dashboard/FocusTimerModal';
import ActivitySessionModal, {
  type ActivitySessionResult,
} from 'features/child/components/dashboard/ActivitySessionModal';
import AdhdSupportSignalsPanel from 'features/child/components/dashboard/AdhdSupportSignalsPanel';
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
import { syncAdhdSupportSignal } from 'features/child/services/adhdSupportSignalService';
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
  const addAdhdSupportSignal = useChildProgressStore((s) => s.addAdhdSupportSignal);
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

  const handleActivityComplete = useCallback((result?: ActivitySessionResult) => {
    if (!activeActivity) return;
    completeActivity(
      activeActivity.id,
      activeActivity.neuroId,
      activeActivity.starsReward,
      activeActivity.durationMinutes,
    );
    if (activeActivity.neuroId === 'adhd' && result?.adhdSupportSignal) {
      addAdhdSupportSignal(activeActivity.id, result.adhdSupportSignal);
      void syncAdhdSupportSignal({
        childId,
        activityId: activeActivity.id,
        activityTitle: activeActivity.title,
        signal: result.adhdSupportSignal,
      }).catch((syncError) => {
        console.warn('ADHD support signal saved locally only:', syncError);
      });
    }
    setCelebration(`+${activeActivity.starsReward} stars! Great job on "${activeActivity.title}"`);
    setActiveActivity(null);
    window.setTimeout(() => setCelebration(null), 4000);
  }, [activeActivity, addAdhdSupportSignal, childId, completeActivity]);

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

      <main className="mx-auto max-w-5xl space-y-6 p-4 pb-16 sm:p-6 sm:pb-20">
        <DashboardHero
          firstName={firstName}
          neuroTypes={neuroTypes}
          todayProgress={todayProgress}
        />

        <section aria-labelledby="start-here-title">
          <div className="mb-3">
            <p className="text-sm font-bold uppercase tracking-wide text-adapt-indigo dark:text-adapt-cyan">Start here</p>
            <h2 id="start-here-title" className="text-2xl font-extrabold text-adapt-navy dark:text-gray-100">What do you need right now?</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => navigate(ROUTES.COMPANION_BUDDY)} className="child-launch-action child-launch-action--buddy">
              <Sparkles className="h-7 w-7" aria-hidden />
              <span><strong>Talk to Buddy</strong><small>Ask for help with words or a next step</small></span>
            </button>
            <button type="button" onClick={() => setShowJournal(true)} className="child-launch-action child-launch-action--mood">
              <Heart className="h-7 w-7" aria-hidden />
              <span><strong>How I feel</strong><small>Choose a feeling or share in your own way</small></span>
            </button>
            <button type="button" onClick={() => navigate(ROUTES.PRONUNCIATION_BUDDY)} className="child-launch-action child-launch-action--learn">
              <Mic2 className="h-7 w-7" aria-hidden />
              <span><strong>My learning tools</strong><small>Speak, read, write or practise</small></span>
            </button>
            <button
              type="button"
              onClick={() => navigate(ROUTES.COMPANION_BUDDY, { state: { quickMessage: 'I need help from an adult' } })}
              className="child-launch-action child-launch-action--help"
            >
              <Hand className="h-7 w-7" aria-hidden />
              <span><strong>I need help</strong><small>Ask a trusted adult to check in</small></span>
            </button>
          </div>
        </section>

        <NowNextLaterBoard
          childId={childId}
          mode="child"
          compact
          onActivityComplete={(activity) => {
            setCelebration(`${activity.emoji} ${activity.label} complete! Great transition.`);
            window.setTimeout(() => setCelebration(null), 3500);
          }}
        />

        <DailyOrbitProgress totalActivities={dailyActivities.length} onMoodCheck={() => setShowJournal(true)} />

        <details className="child-dashboard-drawer">
          <summary><BookOpen className="h-5 w-5" aria-hidden /> Classroom and assignments</summary>
          <div className="space-y-5 pt-5">
            <ChildClassroomPanel childId={childId} />
            <TeacherAssignmentsPanel
              childId={childId}
              onCelebrate={(message) => {
                setCelebration(message);
                window.setTimeout(() => setCelebration(null), 3500);
              }}
            />
            {neuroTypes.includes('adhd') && <AdhdSupportSignalsPanel />}
          </div>
        </details>

        <details className="child-dashboard-drawer">
          <summary><Settings2 className="h-5 w-5" aria-hidden /> More tools and progress</summary>
          <div className="space-y-6 pt-5">
            {neuroTypes.map((neuroId) => (
              <NeuroZoneCard key={neuroId} neuroId={neuroId} activities={getDailyActivitiesForNeuro(neuroId)} onStartActivity={handleStartActivity} />
            ))}
            <MetricsConstellation neuroTypes={neuroTypes} />
            <AccessibilityDock neuroTypes={neuroTypes} />
            <SmartRecommendationsPanel neuroTypes={neuroTypes} onTryRecommendation={handleRecommendation} />
          </div>
        </details>
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
