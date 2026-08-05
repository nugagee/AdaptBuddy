import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Hand,
  Loader2,
  Radio,
  Settings,
  Sparkles,
  Users,
  Volume2,
  XCircle,
} from 'lucide-react';
import TeacherHubNav from 'features/teacher/components/TeacherHubNav';
import ClassroomMediaControls from 'features/classroom/components/ClassroomMediaControls';
import ClassroomSettingsPanel from 'features/classroom/components/ClassroomSettingsPanel';
import ClassroomVideoStage from 'features/classroom/components/ClassroomVideoStage';
import { useClassroomVideo } from 'features/classroom/hooks/useClassroomVideo';
import { useLiveSessionSnapshot } from 'features/classroom/hooks/useLiveSessionSnapshot';
import { ClassLiveSessionService } from 'features/classroom/services/classLiveSessionService';
import {
  ACTIVITY_MODE_LABELS,
  type ClassActivityMode,
  type ClassSessionSettings,
  type SpotlightParticipantId,
} from 'features/classroom/types/classLiveSession.types';
import { useAuth } from 'hooks/useAuth';
import { ROUTES } from 'constants/routes';

const ACTIVITY_MODES: ClassActivityMode[] = ['welcome', 'learn', 'calm', 'check_in', 'break'];

const modeStyles: Record<ClassActivityMode, string> = {
  welcome: 'from-sky-400/20 to-indigo-500/20 border-sky-300/50',
  learn: 'from-emerald-400/20 to-teal-500/20 border-emerald-300/50',
  calm: 'from-violet-400/20 to-purple-500/20 border-violet-300/50',
  check_in: 'from-amber-400/20 to-orange-500/20 border-amber-300/50',
  break: 'from-rose-400/20 to-pink-500/20 border-rose-300/50',
};

const TeacherLiveClassroomPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const teacherId = profile?.id ?? 'guest-teacher';
  const teacherName = profile?.first_name ?? 'Teacher';

  const { snapshot, loading, error, refresh } = useLiveSessionSnapshot(sessionId);
  const [ending, setEnding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState({
    focusTitle: '',
    focusMessage: '',
    nowStep: '',
    nextStep: '',
  });

  const handleMediaSync = useCallback(
    async (patch: { videoEnabled?: boolean; audioEnabled?: boolean }) => {
      if (!sessionId) return;
      try {
        await ClassLiveSessionService.updateTeacherMedia(sessionId, patch);
        await refresh();
      } catch (syncError) {
        console.warn('Teacher media sync failed:', syncError);
      }
    },
    [sessionId, refresh],
  );

  const handleScreenShareChange = useCallback(
    async (active: boolean) => {
      if (!sessionId) return;
      await ClassLiveSessionService.setScreenShareState(sessionId, active, true, teacherId);
      if (active) {
        await ClassLiveSessionService.updateSessionSettings(sessionId, {
          spotlightParticipantId: 'teacher',
        });
      }
      await refresh();
    },
    [sessionId, teacherId, refresh],
  );

  const canTeacherShareScreen =
    !snapshot?.session.activeScreenSharerId ||
    snapshot.session.activeScreenSharerId === teacherId ||
    snapshot.session.teacherScreenSharing;

  const video = useClassroomVideo({
    sessionId,
    localUserId: teacherId,
    localUserName: teacherName,
    role: 'teacher',
    snapshot,
    enabled: Boolean(snapshot && snapshot.session.status === 'live'),
    onMediaSync: handleMediaSync,
    onScreenShareChange: handleScreenShareChange,
    canStartScreenShare: canTeacherShareScreen,
  });

  useEffect(() => {
    if (!snapshot?.session) return;
    const { focusTitle, focusMessage, nowStep, nextStep } = snapshot.session;
    setDraft({ focusTitle, focusMessage, nowStep, nextStep });
  }, [
    snapshot?.session?.id,
    snapshot?.session?.updatedAt,
    snapshot?.session?.focusTitle,
    snapshot?.session?.focusMessage,
    snapshot?.session?.nowStep,
    snapshot?.session?.nextStep,
  ]);

  const joinedParticipants = useMemo(
    () => snapshot?.participants.filter((p) => p.status === 'joined') ?? [],
    [snapshot?.participants],
  );

  const raisedHands = joinedParticipants.filter(
    (p) => p.handRaised && snapshot?.session.allowLearnerHandRaise !== false,
  );
  const pendingScreenShares = joinedParticipants.filter((p) => p.screenShareStatus === 'pending');

  const handleModeChange = useCallback(
    async (mode: ClassActivityMode) => {
      if (!sessionId || saving) return;
      setSaving(true);
      try {
        await ClassLiveSessionService.updateSessionState(sessionId, { activityMode: mode });
        await refresh();
      } finally {
        setSaving(false);
      }
    },
    [sessionId, saving, refresh],
  );

  const handleSaveFocus = useCallback(async () => {
    if (!sessionId || saving) return;
    setSaving(true);
    try {
      await ClassLiveSessionService.updateSessionState(sessionId, draft);
      await refresh();
    } finally {
      setSaving(false);
    }
  }, [sessionId, saving, draft, refresh]);

  const handleSettingsChange = useCallback(
    async (patch: Partial<ClassSessionSettings>) => {
      if (!sessionId || saving) return;
      setSaving(true);
      try {
        await ClassLiveSessionService.updateSessionSettings(sessionId, patch);
        await refresh();
      } finally {
        setSaving(false);
      }
    },
    [sessionId, saving, refresh],
  );

  const handleSpotlight = useCallback(
    async (participantId: SpotlightParticipantId) => {
      if (!sessionId || saving) return;
      setSaving(true);
      try {
        await ClassLiveSessionService.updateSessionSettings(sessionId, {
          spotlightParticipantId: participantId,
        });
        await refresh();
      } finally {
        setSaving(false);
      }
    },
    [sessionId, saving, refresh],
  );

  const handleApproveScreenShare = useCallback(
    async (childId: string) => {
      if (!sessionId || saving) return;
      setSaving(true);
      try {
        await ClassLiveSessionService.respondScreenShareRequest(sessionId, childId, true);
        await ClassLiveSessionService.updateSessionSettings(sessionId, {
          spotlightParticipantId: childId,
        });
        await refresh();
      } finally {
        setSaving(false);
      }
    },
    [sessionId, saving, refresh],
  );

  const handleDenyScreenShare = useCallback(
    async (childId: string) => {
      if (!sessionId || saving) return;
      setSaving(true);
      try {
        await ClassLiveSessionService.respondScreenShareRequest(sessionId, childId, false);
        await refresh();
      } finally {
        setSaving(false);
      }
    },
    [sessionId, saving, refresh],
  );

  const handleRemoveParticipant = useCallback(
    async (childId: string) => {
      if (!sessionId || saving) return;
      setSaving(true);
      try {
        await ClassLiveSessionService.removeParticipant(sessionId, childId);
        await refresh();
      } finally {
        setSaving(false);
      }
    },
    [sessionId, saving, refresh],
  );

  const handleEndSession = useCallback(async () => {
    if (!sessionId || ending) return;
    setEnding(true);
    try {
      await ClassLiveSessionService.endClassSession(sessionId);
      navigate(ROUTES.TEACHER_CLASSES);
    } finally {
      setEnding(false);
    }
  }, [sessionId, ending, navigate]);

  if (loading && !snapshot) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/40 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
        <TeacherHubNav />
        <div className="flex items-center justify-center px-4 py-24">
          <Loader2 className="h-10 w-10 animate-spin text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
        </div>
      </div>
    );
  }

  if (!snapshot || snapshot.session.status === 'ended') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/40 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
        <TeacherHubNav />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <XCircle className="mx-auto h-12 w-12 text-slate-400" aria-hidden />
          <h1 className="mt-4 text-2xl font-extrabold text-adapt-navy dark:text-gray-100">Session ended</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">
            {error ?? 'This live classroom has closed.'}
          </p>
          <Link
            to={ROUTES.TEACHER_CLASSES}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-adapt-navy px-5 py-3 text-sm font-black text-white dark:bg-adapt-cyan dark:text-gray-950"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to classes
          </Link>
        </div>
      </div>
    );
  }

  const { session, classInfo } = snapshot;

  return (
    <div className="min-h-screen bg-gradient-to-br from-adapt-cloud via-white to-adapt-mist/50 dark:from-gray-950 dark:via-gray-950 dark:to-indigo-950/30">
      <TeacherHubNav />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="animate-fade-in animate-slide-up rounded-3xl border border-white/70 bg-white/90 p-6 shadow-card backdrop-blur dark:border-gray-800 dark:bg-gray-900/85">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-red-500 px-3 py-1 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-red-500/30 animate-pulse">
                  <Radio className="h-3.5 w-3.5" aria-hidden />
                  Live
                </span>
                <span className="text-xs font-black uppercase tracking-[0.16em] text-adapt-indigo dark:text-adapt-cyan">
                  {classInfo.className}
                </span>
              </div>
              <h1 className="mt-2 text-3xl font-extrabold text-adapt-navy dark:text-gray-100">
                Live classroom
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                {classInfo.subject} · {classInfo.yearGroup} · {joinedParticipants.length} learners online
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="relative inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
              >
                <Settings className="h-4 w-4" aria-hidden />
                Settings
                {pendingScreenShares.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-black text-white">
                    {pendingScreenShares.length}
                  </span>
                )}
              </button>
              <Link
                to={ROUTES.TEACHER_CLASSES}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Classes
              </Link>
              <button
                type="button"
                onClick={() => void handleEndSession()}
                disabled={ending}
                className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {ending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <XCircle className="h-4 w-4" aria-hidden />}
                End session
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900/85">
              <ClassroomVideoStage
                tiles={video.tiles}
                spotlightId={video.spotlightId}
                teacherId={session.teacherId}
                role="teacher"
                onSpotlight={(participantId) => void handleSpotlight(participantId)}
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
              canToggleScreenShare={canTeacherShareScreen || video.screenSharing}
              busy={video.busy}
              onToggleVideo={() => void video.toggleVideo()}
              onToggleAudio={() => void video.toggleAudio()}
              onToggleScreenShare={() => void video.toggleScreenShare()}
            />

            <section
              className={`rounded-3xl border bg-gradient-to-br p-6 shadow-soft transition-all duration-500 dark:border-gray-800 ${modeStyles[session.activityMode]}`}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-gray-400">
                    Focus board
                  </p>
                  <h2 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">{session.focusTitle}</h2>
                </div>
              </div>
              <p className="mt-4 text-base leading-7 text-slate-600 dark:text-gray-300">{session.focusMessage}</p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/60 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-900/80">
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-300">Now</p>
                  <p className="mt-1 font-bold text-adapt-navy dark:text-gray-100">{session.nowStep || '—'}</p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-900/80">
                  <p className="text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-300">Next</p>
                  <p className="mt-1 font-bold text-adapt-navy dark:text-gray-100">{session.nextStep || '—'}</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900/85">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-adapt-indigo dark:text-adapt-cyan">
                Activity mode
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {ACTIVITY_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    disabled={saving}
                    onClick={() => void handleModeChange(mode)}
                    className={`rounded-2xl px-4 py-2.5 text-sm font-black transition-all duration-300 ${
                      session.activityMode === mode
                        ? 'scale-105 bg-adapt-navy text-white shadow-lg dark:bg-adapt-cyan dark:text-gray-950'
                        : 'border border-slate-200 bg-white text-slate-600 hover:border-adapt-indigo/40 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300'
                    }`}
                  >
                    {ACTIVITY_MODE_LABELS[mode]}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900/85">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-adapt-indigo dark:text-adapt-cyan">
                Update focus
              </p>
              <div className="mt-4 space-y-3">
                <input
                  value={draft.focusTitle}
                  onChange={(e) => setDraft((d) => ({ ...d, focusTitle: e.target.value }))}
                  placeholder="Focus title"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-adapt-indigo dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                />
                <textarea
                  value={draft.focusMessage}
                  onChange={(e) => setDraft((d) => ({ ...d, focusMessage: e.target.value }))}
                  placeholder="Message for learners"
                  rows={2}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-adapt-indigo dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={draft.nowStep}
                    onChange={(e) => setDraft((d) => ({ ...d, nowStep: e.target.value }))}
                    placeholder="Now step"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-adapt-indigo dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  />
                  <input
                    value={draft.nextStep}
                    onChange={(e) => setDraft((d) => ({ ...d, nextStep: e.target.value }))}
                    placeholder="Next step"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-adapt-indigo dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleSaveFocus()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-adapt-navy px-5 py-3 text-sm font-black text-white disabled:opacity-60 dark:bg-adapt-cyan dark:text-gray-950"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
                  Push to learners
                </button>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            {raisedHands.length > 0 && (
              <section className="animate-fade-in animate-slide-in rounded-3xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-100">
                  <Hand className="h-5 w-5" aria-hidden />
                  <h3 className="font-extrabold">Hands raised</h3>
                </div>
                <ul className="mt-3 space-y-2">
                  {raisedHands.map((p) => (
                    <li key={p.id} className="rounded-xl bg-white/80 px-3 py-2 text-sm font-bold dark:bg-gray-900/80">
                      {p.childName}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900/85">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
                <h3 className="font-extrabold text-adapt-navy dark:text-gray-100">Learners in room</h3>
              </div>
              {joinedParticipants.length === 0 ? (
                <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-gray-950 dark:text-gray-400">
                  Waiting for learners to join…
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {joinedParticipants.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-950"
                    >
                      <div>
                        <span className="font-bold text-adapt-navy dark:text-gray-100">{p.childName}</span>
                        <div className="mt-1 flex gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {p.videoEnabled && <span>Cam</span>}
                          {p.audioEnabled && <span>Mic</span>}
                          {p.screenShareStatus === 'pending' && <span>Share?</span>}
                        </div>
                      </div>
                      <span className="text-lg" title={p.moodPulse ?? 'No mood yet'}>
                        {p.moodPulse === 'great' && '😊'}
                        {p.moodPulse === 'okay' && '🙂'}
                        {p.moodPulse === 'unsure' && '😐'}
                        {p.moodPulse === 'wobbly' && '😟'}
                        {p.moodPulse === 'need_help' && '🆘'}
                        {!p.moodPulse && '·'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      </div>

      <ClassroomSettingsPanel
        open={settingsOpen}
        snapshot={snapshot}
        saving={saving}
        onClose={() => setSettingsOpen(false)}
        onChange={handleSettingsChange}
        onSpotlight={(participantId) => void handleSpotlight(participantId)}
        onApproveScreenShare={(childId) => void handleApproveScreenShare(childId)}
        onDenyScreenShare={(childId) => void handleDenyScreenShare(childId)}
        onRemoveParticipant={(childId) => void handleRemoveParticipant(childId)}
      />
    </div>
  );
};

export default TeacherLiveClassroomPage;
