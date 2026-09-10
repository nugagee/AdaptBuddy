import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import AdhdEnergyPacingPanel from 'features/child/components/dashboard/AdhdEnergyPacingPanel';
import AchievementBadgesPanel from 'features/child/components/dashboard/AchievementBadgesPanel';
import DyslexiaReadingProgressPanel from 'features/child/components/dashboard/DyslexiaReadingProgressPanel';
import DyscalculiaProgressPanel from 'features/child/components/dashboard/DyscalculiaProgressPanel';
import DyspraxiaProgressPanel from 'features/child/components/dashboard/DyspraxiaProgressPanel';
import DysgraphiaWordBankProgressPanel from 'features/child/components/dashboard/DysgraphiaWordBankProgressPanel';
import SensoryComfortProgressPanel from 'features/child/components/dashboard/SensoryComfortProgressPanel';
import ChildClassroomPanel from 'features/child/components/dashboard/ChildClassroomPanel';
import TeacherAssignmentsPanel from 'features/child/components/dashboard/TeacherAssignmentsPanel';
import NowNextLaterBoard from 'features/child/components/NowNextLaterBoard';
import AuthSuccessBanner from 'components/auth/AuthSuccessBanner';
import {
  getActivitiesForNeuros,
  getAllActivitiesForNeuro,
  type NeuroActivity,
} from 'features/child/data/neuroDashboardContent';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import {
  getReadyChildProgressForOwner,
  useChildProgressReadAccess,
} from 'features/child/store/childProgressReadAccess';
import { syncAdhdSupportSignal } from 'features/child/services/adhdSupportSignalService';
import { useActiveChildSupportProfile } from 'features/child/hooks/useActiveChildSupportProfile';
import { adaptAdhdActivitiesForEnergy } from 'features/child/utils/adhdEnergyPacing';
import {
  getDailyMissionCompletions,
  getDailyMissionProgress,
} from 'features/child/utils/dailyMissionProgress';
import { useAuth } from 'hooks/useAuth';
import { ROUTES } from 'constants/routes';
import { buildActivityLaunchPath } from 'features/child/routing/routedActivityCompletion';
import '../components/dashboard/child-dashboard.css';

const ChildDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user, isGuest } = useAuth();
  const { preferredName } = useActiveChildSupportProfile();
  const authenticatedChildId =
    !isGuest && user?.id && profile?.role === 'child' && profile.id === user.id
      ? user.id
      : null;

  const [showJournal, setShowJournal] = useState(false);
  const [activeActivity, setActiveActivity] = useState<NeuroActivity | null>(null);
  const [showFocusTimer, setShowFocusTimer] = useState(false);
  const [celebration, setCelebration] = useState<string | null>(null);
  const journalOwnerIdRef = useRef<string | null>(null);
  const activityOwnerIdRef = useRef<string | null>(null);
  const focusOwnerIdRef = useRef<string | null>(null);
  const celebrationTimeoutRef = useRef<number | null>(null);

  const storedAdhdEnergyPacing = useChildProgressStore((s) => s.adhdEnergyPacing);
  const storedCompletions = useChildProgressStore((s) => s.completions);
  const { isReady: isProgressReady } = useChildProgressReadAccess();
  const adhdEnergyPacing = isProgressReady ? storedAdhdEnergyPacing : null;
  const completions = isProgressReady ? storedCompletions : [];

  const firstName = preferredName;
  const childId = authenticatedChildId ?? profile?.id ?? 'guest-child';
  const neuroTypes = useMemo(
    () => profile?.neuro_types ?? [],
    [profile?.neuro_types],
  );
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayEnergyPacing = adhdEnergyPacing?.checkedAt.startsWith(todayKey)
    ? adhdEnergyPacing
    : null;
  const dailyActivities = useMemo(
    () => adaptAdhdActivitiesForEnergy(getActivitiesForNeuros(neuroTypes), todayEnergyPacing),
    [neuroTypes, todayEnergyPacing],
  );
  const dailyActivityIds = useMemo(
    () => dailyActivities.map((activity) => activity.id),
    [dailyActivities],
  );
  const welcomeMessage = (location.state as { message?: string } | null)?.message;

  const today = new Date().toISOString().slice(0, 10);
  const todayCompletedCount = getDailyMissionCompletions(
    completions,
    dailyActivityIds,
    today,
  ).length;
  const todayProgress = getDailyMissionProgress(todayCompletedCount, dailyActivities.length);

  useEffect(() => {
    journalOwnerIdRef.current = null;
    activityOwnerIdRef.current = null;
    focusOwnerIdRef.current = null;
    setShowJournal(false);
    setActiveActivity(null);
    setShowFocusTimer(false);
    setCelebration(null);
    if (celebrationTimeoutRef.current !== null) {
      window.clearTimeout(celebrationTimeoutRef.current);
      celebrationTimeoutRef.current = null;
    }

    return () => {
      if (celebrationTimeoutRef.current !== null) {
        window.clearTimeout(celebrationTimeoutRef.current);
        celebrationTimeoutRef.current = null;
      }
    };
  }, [childId]);

  const showCelebrationForOwner = useCallback((
    expectedOwnerId: string | null,
    message: string,
    durationMs: number,
  ) => {
    if (!getReadyChildProgressForOwner(expectedOwnerId)) return;
    if (celebrationTimeoutRef.current !== null) {
      window.clearTimeout(celebrationTimeoutRef.current);
    }
    setCelebration(message);
    const timeout = window.setTimeout(() => {
      if (getReadyChildProgressForOwner(expectedOwnerId)) setCelebration(null);
      if (celebrationTimeoutRef.current === timeout) celebrationTimeoutRef.current = null;
    }, durationMs);
    celebrationTimeoutRef.current = timeout;
  }, []);

  const openJournal = useCallback(() => {
    const expectedOwnerId = childId;
    if (!getReadyChildProgressForOwner(expectedOwnerId)) return;

    journalOwnerIdRef.current = expectedOwnerId;
    setShowJournal(true);
  }, [childId]);

  const closeActivity = useCallback((expectedOwnerId: string) => {
    if (activityOwnerIdRef.current !== expectedOwnerId) return;

    activityOwnerIdRef.current = null;
    setActiveActivity(null);
  }, []);

  const closeFocusTimer = useCallback((expectedOwnerId: string) => {
    if (focusOwnerIdRef.current !== expectedOwnerId) return;

    focusOwnerIdRef.current = null;
    setShowFocusTimer(false);
  }, []);

  const handleStartActivity = useCallback(
    (activity: NeuroActivity) => {
      if (activity.availability === 'planned') return;
      if (activity.action === 'journal') {
        openJournal();
        return;
      }
      if (activity.action === 'focus-timer') {
        const expectedOwnerId = childId;
        if (!getReadyChildProgressForOwner(expectedOwnerId)) return;

        focusOwnerIdRef.current = expectedOwnerId;
        setShowFocusTimer(true);
        return;
      }
      if (activity.route) {
        navigate(buildActivityLaunchPath(activity) ?? activity.route);
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

      const expectedOwnerId = childId;
      if (!getReadyChildProgressForOwner(expectedOwnerId)) return;

      activityOwnerIdRef.current = expectedOwnerId;
      setActiveActivity(activity);
    },
    [childId, navigate, openJournal],
  );

  const handleActivityComplete = useCallback((
    expectedOwnerId: string,
    activity: NeuroActivity,
    result?: ActivitySessionResult,
  ) => {
    const progress = getReadyChildProgressForOwner(expectedOwnerId);
    if (activityOwnerIdRef.current !== expectedOwnerId || !progress) {
      closeActivity(expectedOwnerId);
      return;
    }

    progress.completeActivity(
      activity.id,
      activity.neuroId,
      activity.starsReward,
      activity.durationMinutes,
    );
    if (activity.neuroId === 'adhd' && result?.adhdSupportSignal) {
      progress.addAdhdSupportSignal(activity.id, result.adhdSupportSignal);
      void syncAdhdSupportSignal({
        childId: expectedOwnerId,
        activityId: activity.id,
        activityTitle: activity.title,
        signal: result.adhdSupportSignal,
      }).catch((syncError) => {
        console.warn('ADHD support signal saved locally only:', syncError);
      });
    }
    if (result?.achievementBadge) {
      progress.unlockAchievementBadge(result.achievementBadge);
    }
    if (result?.adhdEnergyPacing) {
      progress.setAdhdEnergyPacing(result.adhdEnergyPacing);
    }
    if (result?.dyslexiaReadingSession) {
      progress.addDyslexiaReadingSession(result.dyslexiaReadingSession);
    }
    if (result?.dyslexiaReaderPreferences) {
      progress.setDyslexiaReaderPreferences(result.dyslexiaReaderPreferences);
    }
    if (result?.dyslexiaPhonicsSession) {
      progress.addDyslexiaPhonicsSession(result.dyslexiaPhonicsSession);
    }
    if (result?.dyscalculiaSession) {
      progress.addDyscalculiaSession(result.dyscalculiaSession);
    }
    if (result?.dyspraxiaPlanningSession) {
      progress.addDyspraxiaPlanningSession(result.dyspraxiaPlanningSession);
    }
    if (result?.dysgraphiaWordBankSession) {
      progress.addDysgraphiaWordBankSession(result.dysgraphiaWordBankSession);
    }
    if (result?.sensoryComfortSession) {
      progress.addSensoryComfortSession(result.sensoryComfortSession);
    }
    showCelebrationForOwner(
      expectedOwnerId,
      result?.achievementBadge
        ? `${result.achievementBadge.emoji} ${result.achievementBadge.title} badge unlocked! +${activity.starsReward} stars`
        : `+${activity.starsReward} stars! Great job on "${activity.title}"`,
      4000,
    );
    closeActivity(expectedOwnerId);
  }, [closeActivity, showCelebrationForOwner]);

  const handleFocusComplete = useCallback((
    expectedOwnerId: string,
    sessionDurationMinutes: number,
  ) => {
    const progress = getReadyChildProgressForOwner(expectedOwnerId);
    if (focusOwnerIdRef.current !== expectedOwnerId || !progress) {
      closeFocusTimer(expectedOwnerId);
      return;
    }

    progress.completeActivity('adhd-focus-sprint', 'adhd', 5, sessionDurationMinutes);
    closeFocusTimer(expectedOwnerId);
    showCelebrationForOwner(expectedOwnerId, 'Focus sprint complete! +5 stars', 4000);
  }, [closeFocusTimer, showCelebrationForOwner]);

  const handleJournalClose = useCallback((expectedOwnerId: string) => {
    if (journalOwnerIdRef.current !== expectedOwnerId) return;

    const progress = getReadyChildProgressForOwner(expectedOwnerId);
    journalOwnerIdRef.current = null;
    setShowJournal(false);
    if (!progress) return;

    const moodActivity = dailyActivities.find((a) => a.action === 'journal');
    if (moodActivity && !progress.isActivityCompletedToday(moodActivity.id)) {
      progress.completeActivity(moodActivity.id, moodActivity.neuroId, moodActivity.starsReward, moodActivity.durationMinutes);
    }
  }, [dailyActivities]);

  const handleJournalSave = useCallback((expectedOwnerId: string, mood: string) => {
    const progress = getReadyChildProgressForOwner(expectedOwnerId);
    if (journalOwnerIdRef.current !== expectedOwnerId || !progress) return;

    progress.setTodayMood(mood);
  }, []);

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
            <button type="button" onClick={openJournal} className="child-launch-action child-launch-action--mood">
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
            showCelebrationForOwner(
              childId,
              `${activity.emoji} ${activity.label} complete! Great transition.`,
              3500,
            );
          }}
        />

        {neuroTypes.includes('adhd') && (
          <>
            <AdhdEnergyPacingPanel />
            <AdhdSupportSignalsPanel />
            <AchievementBadgesPanel />
          </>
        )}

        {neuroTypes.includes('dyslexia') && <DyslexiaReadingProgressPanel />}
        {neuroTypes.includes('dyscalculia') && <DyscalculiaProgressPanel />}
        {neuroTypes.includes('dyspraxia') && <DyspraxiaProgressPanel />}
        {neuroTypes.includes('dysgraphia') && <DysgraphiaWordBankProgressPanel />}
        {neuroTypes.includes('spd') && <SensoryComfortProgressPanel />}
        <DailyOrbitProgress activityIds={dailyActivityIds} onMoodCheck={openJournal} />

        <details className="child-dashboard-drawer">
          <summary><BookOpen className="h-5 w-5" aria-hidden /> Classroom and assignments</summary>
          <div className="space-y-5 pt-5">
            <ChildClassroomPanel childId={childId} />
            <TeacherAssignmentsPanel
              childId={childId}
              onCelebrate={(message) => {
                showCelebrationForOwner(childId, message, 3500);
              }}
            />
          </div>
        </details>

        <details className="child-dashboard-drawer">
          <summary><Settings2 className="h-5 w-5" aria-hidden /> More tools and progress</summary>
          <div className="space-y-6 pt-5">
            {neuroTypes.map((neuroId) => (
              <NeuroZoneCard
                key={neuroId}
                neuroId={neuroId}
                activities={adaptAdhdActivitiesForEnergy(
                  getAllActivitiesForNeuro(neuroId),
                  todayEnergyPacing,
                )}
                onStartActivity={handleStartActivity}
              />
            ))}
            <MetricsConstellation neuroTypes={neuroTypes} />
            <AccessibilityDock neuroTypes={neuroTypes} />
            <SmartRecommendationsPanel
              neuroTypes={neuroTypes}
              onTryRecommendation={handleStartActivity}
            />
          </div>
        </details>
      </main>

      {showJournal && journalOwnerIdRef.current && (
        <FeelingsJournal
          ownerId={journalOwnerIdRef.current}
          onClose={handleJournalClose}
          onSave={handleJournalSave}
        />
      )}

      {activeActivity && activityOwnerIdRef.current && (
        <ActivitySessionModal
          activity={activeActivity}
          onClose={closeActivity.bind(null, activityOwnerIdRef.current)}
          onComplete={handleActivityComplete.bind(
            null,
            activityOwnerIdRef.current,
            activeActivity,
          )}
        />
      )}

      {showFocusTimer && focusOwnerIdRef.current && (
        <FocusTimerModal
          ownerId={focusOwnerIdRef.current}
          durationMinutes={dailyActivities.find((activity) => activity.id === 'adhd-focus-sprint')?.durationMinutes ?? 12}
          onClose={closeFocusTimer}
          onComplete={handleFocusComplete}
        />
      )}
    </div>
  );
};

export default ChildDashboardPage;
