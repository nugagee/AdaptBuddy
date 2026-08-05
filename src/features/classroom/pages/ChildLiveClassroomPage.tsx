import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Hand,
  Heart,
  Loader2,
  Radio,
  Sparkles,
  Wind,
  XCircle,
} from 'lucide-react';
import ChildDashboardNavbar from 'features/child/components/layout/ChildDashboardNavbar';
import ClassroomMediaControls from 'features/classroom/components/ClassroomMediaControls';
import ClassroomVideoStage from 'features/classroom/components/ClassroomVideoStage';
import { useClassroomVideo } from 'features/classroom/hooks/useClassroomVideo';
import { useAuth } from 'hooks/useAuth';
import { useLiveSessionSnapshot } from 'features/classroom/hooks/useLiveSessionSnapshot';
import { ClassLiveSessionService } from 'features/classroom/services/classLiveSessionService';
import {
  ACTIVITY_MODE_LABELS,
  MOOD_PULSE_OPTIONS,
} from 'features/classroom/types/classLiveSession.types';
import { ROUTES } from 'constants/routes';

const ChildLiveClassroomPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const childId = profile?.id ?? 'guest-child';
  const childName = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name.charAt(0)}.` : ''}`
    : 'Alex A.';

  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [handRaised, setHandRaised] = useState(false);
  const [moodPulse, setMoodPulse] = useState<string | null>(null);

  const { snapshot, loading, error, refresh } = useLiveSessionSnapshot(sessionId, joined);

  const myParticipant = snapshot?.participants.find((participant) => participant.childId === childId);
  const screenShareStatus = myParticipant?.screenShareStatus ?? 'none';
  const requireScreenShareApproval = snapshot?.session.requireScreenShareApproval ?? true;
  const canStartScreenShare =
    (!snapshot?.session.activeScreenSharerId || snapshot.session.activeScreenSharerId === childId) &&
    (screenShareStatus === 'approved' ||
      screenShareStatus === 'active' ||
      !requireScreenShareApproval);

  const handleMediaSync = useCallback(
    async (patch: { videoEnabled?: boolean; audioEnabled?: boolean }) => {
      if (!sessionId) return;
      try {
        await ClassLiveSessionService.sendParticipantPulse(sessionId, patch, childId);
        await refresh();
      } catch (error) {
        console.warn('Learner media sync failed:', error);
      }
    },
    [sessionId, childId, refresh],
  );

  const handleScreenShareChange = useCallback(
    async (active: boolean) => {
      if (!sessionId) return;
      await ClassLiveSessionService.setScreenShareState(sessionId, active, false, childId);
      await refresh();
    },
    [sessionId, childId, refresh],
  );

  const video = useClassroomVideo({
    sessionId,
    localUserId: childId,
    localUserName: childName,
    role: 'learner',
    snapshot,
    enabled: joined && Boolean(snapshot && snapshot.session.status === 'live'),
    onMediaSync: handleMediaSync,
    onScreenShareChange: handleScreenShareChange,
    learnerScreenShareStatus: screenShareStatus,
    canStartScreenShare,
  });

  useEffect(() => {
    if (!sessionId || joined) return;
    const autoJoin = async () => {
      setJoining(true);
      setJoinError(null);
      try {
        await ClassLiveSessionService.joinClassSession(sessionId, childId, childName);
        setJoined(true);
      } catch (joinErr) {
        setJoinError(joinErr instanceof Error ? joinErr.message : 'Could not join classroom.');
      } finally {
        setJoining(false);
      }
    };
    void autoJoin();
  }, [sessionId, childId, childName, joined]);

  useEffect(() => {
    if (!joined || !snapshot) return;
    const myRecord = snapshot.participants.find((participant) => participant.childId === childId);
    if (myRecord?.status === 'removed') {
      navigate(ROUTES.CHILD_DASHBOARD, {
        state: { message: 'Your teacher removed you from this classroom.' },
      });
    }
  }, [snapshot, joined, childId, navigate]);

  const handleScreenShareClick = useCallback(async () => {
    if (!sessionId) return;
    if (video.screenSharing) {
      await video.toggleScreenShare();
      return;
    }
    if (requireScreenShareApproval && screenShareStatus === 'none') {
      try {
        await ClassLiveSessionService.requestScreenShare(sessionId, childId);
        await refresh();
      } catch (requestError) {
        console.warn('Screen share request failed:', requestError);
      }
      return;
    }
    await video.toggleScreenShare();
  }, [
    sessionId,
    childId,
    refresh,
    requireScreenShareApproval,
    screenShareStatus,
    video,
  ]);

  const screenShareLabel =
    screenShareStatus === 'pending'
      ? 'Waiting for approval'
      : requireScreenShareApproval && screenShareStatus === 'none'
        ? 'Request to share screen'
        : screenShareStatus === 'approved'
          ? 'Share screen now'
          : 'Share screen';

  const handleMood = useCallback(
    async (mood: string) => {
      if (!sessionId) return;
      setMoodPulse(mood);
      await ClassLiveSessionService.sendParticipantPulse(sessionId, { moodPulse: mood }, childId);
      await refresh();
    },
    [sessionId, childId, refresh],
  );

  const handleHand = useCallback(async () => {
    if (!sessionId || snapshot?.session.allowLearnerHandRaise === false) return;
    const next = !handRaised;
    setHandRaised(next);
    await ClassLiveSessionService.sendParticipantPulse(sessionId, { handRaised: next }, childId);
    await refresh();
  }, [sessionId, childId, handRaised, refresh, snapshot?.session.allowLearnerHandRaise]);

  const handleLeave = useCallback(async () => {
    if (!sessionId || leaving) return;
    setLeaving(true);
    try {
      await ClassLiveSessionService.leaveClassSession(sessionId, childId);
      navigate(ROUTES.CHILD_DASHBOARD);
    } finally {
      setLeaving(false);
    }
  }, [sessionId, childId, leaving, navigate]);

  if ((loading || joining) && !snapshot) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/40 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
        <ChildDashboardNavbar />
        <div className="flex flex-col items-center justify-center gap-4 px-4 py-24">
          <Loader2 className="h-10 w-10 animate-spin text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
          <p className="text-sm font-bold text-slate-500 dark:text-gray-400">Joining your classroom…</p>
        </div>
      </div>
    );
  }

  if (joinError || !snapshot || snapshot.session.status === 'ended') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/40 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
        <ChildDashboardNavbar />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <XCircle className="mx-auto h-12 w-12 text-slate-400" aria-hidden />
          <h1 className="mt-4 text-2xl font-extrabold text-adapt-navy dark:text-gray-100">Classroom closed</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">
            {joinError ?? error ?? 'Your teacher has ended this session.'}
          </p>
          <Link
            to={ROUTES.CHILD_DASHBOARD}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-adapt-indigo px-5 py-3 text-sm font-black text-white dark:bg-adapt-cyan dark:text-gray-950"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back home
          </Link>
        </div>
      </div>
    );
  }

  const { session, classInfo } = snapshot;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/80 via-white to-emerald-50/60 dark:from-gray-950 dark:via-gray-950 dark:to-indigo-950/40">
      <ChildDashboardNavbar />

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
        <header className="animate-fade-in animate-slide-up rounded-3xl border border-white/80 bg-white/90 p-6 shadow-card backdrop-blur dark:border-gray-800 dark:bg-gray-900/85">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-red-500 px-3 py-1 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-red-500/25 animate-pulse">
                <Radio className="h-3.5 w-3.5" aria-hidden />
                Live now
              </span>
              <h1 className="mt-3 text-2xl font-extrabold text-adapt-navy dark:text-gray-100 sm:text-3xl">
                {classInfo.className}
              </h1>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-gray-400">
                {ACTIVITY_MODE_LABELS[session.activityMode]}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleLeave()}
              disabled={leaving}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
            >
              {leaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ArrowLeft className="h-4 w-4" aria-hidden />}
              Leave room
            </button>
          </div>
        </header>

        <section className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900/85">
          <ClassroomVideoStage
            tiles={video.tiles}
            spotlightId={video.spotlightId}
            teacherId={session.teacherId}
            role="learner"
          />
          {video.mediaError && (
            <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-200">
              {video.mediaError}
            </p>
          )}
        </section>

        <ClassroomMediaControls
          videoEnabled={video.videoEnabled}
          audioEnabled={video.audioEnabled}
          screenSharing={video.screenSharing}
          canToggleVideo={video.canToggleVideo}
          canToggleMic={video.canToggleMic}
          canToggleScreenShare={
            screenShareStatus !== 'pending' &&
            (canStartScreenShare || video.screenSharing || screenShareStatus === 'none')
          }
          screenShareLabel={screenShareLabel}
          busy={video.busy}
          restrictVideo={video.restrictVideo}
          restrictMic={video.restrictMic}
          onToggleVideo={() => void video.toggleVideo()}
          onToggleAudio={() => void video.toggleAudio()}
          onToggleScreenShare={() => void handleScreenShareClick()}
        />

        {screenShareStatus === 'pending' && (
          <p className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100">
            Your teacher will approve your screen share request soon.
          </p>
        )}

        {screenShareStatus === 'approved' && !video.screenSharing && (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
            Your teacher approved screen sharing — tap Share screen now when you are ready.
          </p>
        )}

        <section className="animate-fade-in animate-slide-up rounded-3xl border border-adapt-indigo/15 bg-gradient-to-br from-white to-adapt-mist/30 p-6 shadow-soft dark:border-adapt-cyan/20 dark:from-gray-900 dark:to-indigo-950/30">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
              <Sparkles className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">{session.focusTitle}</h2>
              <p className="mt-2 text-base leading-7 text-slate-600 dark:text-gray-300">{session.focusMessage}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/80 p-4 transition-all duration-500 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <p className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Now</p>
              <p className="mt-1 text-lg font-extrabold text-adapt-navy dark:text-gray-100">
                {session.nowStep || 'Listen and get ready'}
              </p>
            </div>
            <div className="rounded-2xl border-2 border-sky-200 bg-sky-50/80 p-4 transition-all duration-500 dark:border-sky-900/50 dark:bg-sky-950/20">
              <p className="text-xs font-black uppercase tracking-wider text-sky-700 dark:text-sky-300">Next</p>
              <p className="mt-1 text-lg font-extrabold text-adapt-navy dark:text-gray-100">
                {session.nextStep || 'We will move on together'}
              </p>
            </div>
          </div>
        </section>

        <section className="animate-fade-in animate-slide-up rounded-3xl border border-white/70 bg-white/90 p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900/85">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" aria-hidden />
            <h3 className="font-extrabold text-adapt-navy dark:text-gray-100">How are you feeling?</h3>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {MOOD_PULSE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => void handleMood(option.id)}
                className={`rounded-2xl px-4 py-3 text-sm font-black transition-all duration-300 ${
                  moodPulse === option.id
                    ? 'scale-105 bg-adapt-indigo text-white shadow-lg dark:bg-adapt-cyan dark:text-gray-950'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-adapt-indigo/30 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200'
                }`}
              >
                <span className="mr-1.5">{option.emoji}</span>
                {option.label}
              </button>
            ))}
          </div>
        </section>

        {snapshot?.session.allowLearnerHandRaise !== false && (
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void handleHand()}
            className={`animate-fade-in flex items-center justify-center gap-3 rounded-3xl border-2 px-5 py-5 text-base font-extrabold transition-all duration-300 ${
              handRaised
                ? 'border-amber-400 bg-amber-100 text-amber-900 shadow-lg dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-100'
                : 'border-slate-200 bg-white text-adapt-navy hover:border-amber-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'
            }`}
          >
            <Hand className="h-6 w-6" aria-hidden />
            {handRaised ? 'Hand raised!' : 'Raise my hand'}
          </button>

          <Link
            to={ROUTES.AUTISM_SPACE}
            className="animate-fade-in flex items-center justify-center gap-3 rounded-3xl border-2 border-violet-200 bg-violet-50 px-5 py-5 text-base font-extrabold text-violet-900 transition hover:border-violet-300 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-100"
          >
            <Wind className="h-6 w-6" aria-hidden />
            Calm corner
          </Link>
        </div>
        )}

        <p className="text-center text-xs font-semibold text-slate-400 dark:text-gray-500">
          {snapshot.participants.filter((p) => p.status === 'joined').length} learners in this room with you
        </p>
      </div>
    </div>
  );
};

export default ChildLiveClassroomPage;
