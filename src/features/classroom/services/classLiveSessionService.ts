import { getSupabaseClient, isSupabaseConfigured } from 'services/supabase/client';
import type {
  ChildClassSessionHistoryItem,
  ChildLiveClassroom,
  ClassActivityMode,
  ClassLiveSession,
  ClassSessionParticipant,
  ClassSessionSettings,
  ClassSessionSnapshot,
  LaunchClassroomConfig,
  ScreenShareStatus,
  SpotlightParticipantId,
  TeacherClassSessionHistoryItem,
  TeacherLiveSessionSummary,
  TeacherSessionHistoryParticipant,
} from 'features/classroom/types/classLiveSession.types';
import { DEFAULT_CLASS_SESSION_SETTINGS, DEFAULT_LAUNCH_CLASSROOM_CONFIG, TEACHER_SPOTLIGHT_ID } from 'features/classroom/types/classLiveSession.types';

const GUEST_STORAGE_KEY = 'adaptbuddy-guest-live-sessions';

interface GuestStore {
  sessions: Record<string, ClassLiveSession>;
  participants: Record<string, ClassSessionParticipant[]>;
}

const defaultGuestStore = (): GuestStore => ({ sessions: {}, participants: {} });

const readGuestStore = (): GuestStore => {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return defaultGuestStore();
    return JSON.parse(raw) as GuestStore;
  } catch {
    return defaultGuestStore();
  }
};

const writeGuestStore = (store: GuestStore) => {
  localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(store));
};

const mapSession = (row: Record<string, unknown>): ClassLiveSession => ({
  id: String(row.id),
  classId: String(row.classId ?? row.class_id),
  teacherId: String(row.teacherId ?? row.teacher_id),
  status: (row.status as ClassLiveSession['status']) ?? 'live',
  launchedAt: String(row.launchedAt ?? row.launched_at ?? new Date().toISOString()),
  endedAt: (row.endedAt ?? row.ended_at ?? null) as string | null,
  focusTitle: String(row.focusTitle ?? row.focus_title ?? 'Our classroom is live'),
  focusMessage: String(
    row.focusMessage ??
      row.focus_message ??
      'Join when you feel ready — we will take it step by step.',
  ),
  activityMode: (row.activityMode ?? row.activity_mode ?? 'welcome') as ClassActivityMode,
  nowStep: String(row.nowStep ?? row.now_step ?? ''),
  nextStep: String(row.nextStep ?? row.next_step ?? ''),
  updatedAt: String(row.updatedAt ?? row.updated_at ?? new Date().toISOString()),
  spotlightParticipantId: String(
    row.spotlightParticipantId ?? row.spotlight_participant_id ?? TEACHER_SPOTLIGHT_ID,
  ) as SpotlightParticipantId,
  restrictLearnerVideo: Boolean(row.restrictLearnerVideo ?? row.restrict_learner_video ?? false),
  restrictLearnerMic: Boolean(row.restrictLearnerMic ?? row.restrict_learner_mic ?? false),
  requireScreenShareApproval: Boolean(
    row.requireScreenShareApproval ?? row.require_screen_share_approval ?? true,
  ),
  allowLearnerHandRaise: Boolean(row.allowLearnerHandRaise ?? row.allow_learner_hand_raise ?? true),
  activeScreenSharerId: (row.activeScreenSharerId ?? row.active_screen_sharer_id ?? null) as string | null,
  teacherScreenSharing: Boolean(row.teacherScreenSharing ?? row.teacher_screen_sharing ?? false),
  teacherVideoEnabled: Boolean(row.teacherVideoEnabled ?? row.teacher_video_enabled ?? false),
  teacherAudioEnabled: Boolean(row.teacherAudioEnabled ?? row.teacher_audio_enabled ?? false),
});

const mapParticipant = (row: Record<string, unknown>): ClassSessionParticipant => ({
  id: String(row.id ?? row.childId ?? row.child_id),
  childId: String(row.childId ?? row.child_id),
  childName: String(row.childName ?? row.child_name ?? 'Learner'),
  joinedAt: String(row.joinedAt ?? row.joined_at ?? new Date().toISOString()),
  leftAt: (row.leftAt ?? row.left_at ?? null) as string | null,
  lastSeenAt: String(row.lastSeenAt ?? row.last_seen_at ?? new Date().toISOString()),
  moodPulse: (row.moodPulse ?? row.mood_pulse ?? null) as string | null,
  handRaised: Boolean(row.handRaised ?? row.hand_raised),
  videoEnabled: Boolean(row.videoEnabled ?? row.video_enabled ?? false),
  audioEnabled: Boolean(row.audioEnabled ?? row.audio_enabled ?? false),
  screenShareStatus: (row.screenShareStatus ?? row.screen_share_status ?? 'none') as ScreenShareStatus,
  screenSharing: Boolean(row.screenSharing ?? row.screen_sharing ?? false),
  status: (row.status as ClassSessionParticipant['status']) ?? 'joined',
});

const computeDurationSeconds = (
  joinedAt: string,
  leftAt?: string | null,
  endedAt?: string | null,
  lastSeenAt?: string | null,
): number => {
  const start = new Date(joinedAt).getTime();
  const end = new Date(leftAt || endedAt || lastSeenAt || Date.now()).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
  return Math.floor((end - start) / 1000);
};

const guestDemoHistory = (childId: string): ChildClassSessionHistoryItem[] => {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const demoSessions: ChildClassSessionHistoryItem[] = [
    {
      sessionId: 'demo-past-session-1',
      classId: 'guest-class',
      className: 'Year 4 Maths',
      schoolName: 'AdaptBuddy Demo School',
      subject: 'Maths',
      yearGroup: 'Year 4',
      classCode: 'Y4-MATH-82',
      teacherName: 'Ms. Rivera',
      sessionStatus: 'ended',
      activityMode: 'learn',
      focusTitle: 'Fractions with friends',
      focusMessage: 'We practised halves and quarters using visual blocks.',
      nowStep: 'Share one fraction example',
      nextStep: 'Quiet pack-up',
      launchedAt: new Date(now - 2 * day - 45 * 60 * 1000).toISOString(),
      endedAt: new Date(now - 2 * day).toISOString(),
      joinedAt: new Date(now - 2 * day - 40 * 60 * 1000).toISOString(),
      leftAt: new Date(now - 2 * day).toISOString(),
      lastSeenAt: new Date(now - 2 * day).toISOString(),
      participantStatus: 'left',
      moodPulse: 'great',
      durationSeconds: 40 * 60,
    },
    {
      sessionId: 'demo-past-session-2',
      classId: 'guest-class',
      className: 'Year 4 Maths',
      schoolName: 'AdaptBuddy Demo School',
      subject: 'Maths',
      yearGroup: 'Year 4',
      classCode: 'Y4-MATH-82',
      teacherName: 'Ms. Rivera',
      sessionStatus: 'ended',
      activityMode: 'calm',
      focusTitle: 'Calm counting circle',
      focusMessage: 'A gentle warm-up before number patterns.',
      nowStep: 'Breathe and count to ten',
      nextStep: 'Pattern hunt',
      launchedAt: new Date(now - 5 * day - 30 * 60 * 1000).toISOString(),
      endedAt: new Date(now - 5 * day).toISOString(),
      joinedAt: new Date(now - 5 * day - 28 * 60 * 1000).toISOString(),
      leftAt: new Date(now - 5 * day).toISOString(),
      lastSeenAt: new Date(now - 5 * day).toISOString(),
      participantStatus: 'left',
      moodPulse: 'okay',
      durationSeconds: 28 * 60,
    },
    {
      sessionId: 'demo-past-session-3',
      classId: 'guest-class-reading',
      className: 'Reading Circle',
      schoolName: 'AdaptBuddy Demo School',
      subject: 'Literacy',
      yearGroup: 'Year 4',
      classCode: 'Y4-READ-11',
      teacherName: 'Mr. Okonkwo',
      sessionStatus: 'ended',
      activityMode: 'check_in',
      focusTitle: 'Story feelings check-in',
      focusMessage: 'We talked about characters and how the story made us feel.',
      nowStep: 'Share one feeling word',
      nextStep: 'Pick a favourite page',
      launchedAt: new Date(now - 8 * day - 35 * 60 * 1000).toISOString(),
      endedAt: new Date(now - 8 * day).toISOString(),
      joinedAt: new Date(now - 8 * day - 33 * 60 * 1000).toISOString(),
      leftAt: new Date(now - 8 * day - 5 * 60 * 1000).toISOString(),
      lastSeenAt: new Date(now - 8 * day - 5 * 60 * 1000).toISOString(),
      participantStatus: 'left',
      moodPulse: 'unsure',
      durationSeconds: 28 * 60,
    },
  ];
  return demoSessions.map((item) => ({ ...item, sessionId: `${item.sessionId}-${childId}` }));
};

const guestTeacherDemoHistory = (): TeacherClassSessionHistoryItem[] => {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return [
    {
      sessionId: 'demo-teacher-past-1',
      classId: 'guest-class',
      className: 'Year 4 Maths',
      schoolName: 'AdaptBuddy Demo School',
      subject: 'Maths',
      yearGroup: 'Year 4',
      classCode: 'Y4-MATH-82',
      sessionStatus: 'ended',
      activityMode: 'learn',
      focusTitle: 'Fractions with friends',
      focusMessage: 'We practised halves and quarters using visual blocks.',
      nowStep: 'Share one fraction example',
      nextStep: 'Quiet pack-up',
      launchedAt: new Date(now - 2 * day - 45 * 60 * 1000).toISOString(),
      endedAt: new Date(now - 2 * day).toISOString(),
      durationSeconds: 45 * 60,
      restrictLearnerVideo: false,
      restrictLearnerMic: false,
      requireScreenShareApproval: true,
      allowLearnerHandRaise: true,
      participantCount: 3,
      removedCount: 0,
      participants: [
        {
          childId: 'guest-child-a',
          childName: 'Alex A.',
          joinedAt: new Date(now - 2 * day - 40 * 60 * 1000).toISOString(),
          leftAt: new Date(now - 2 * day).toISOString(),
          lastSeenAt: new Date(now - 2 * day).toISOString(),
          status: 'left',
          moodPulse: 'great',
          durationSeconds: 40 * 60,
        },
        {
          childId: 'guest-child-b',
          childName: 'Sam B.',
          joinedAt: new Date(now - 2 * day - 38 * 60 * 1000).toISOString(),
          leftAt: new Date(now - 2 * day - 2 * 60 * 1000).toISOString(),
          lastSeenAt: new Date(now - 2 * day - 2 * 60 * 1000).toISOString(),
          status: 'left',
          moodPulse: 'okay',
          durationSeconds: 36 * 60,
        },
        {
          childId: 'guest-child-c',
          childName: 'Jordan C.',
          joinedAt: new Date(now - 2 * day - 35 * 60 * 1000).toISOString(),
          leftAt: new Date(now - 2 * day).toISOString(),
          lastSeenAt: new Date(now - 2 * day).toISOString(),
          status: 'left',
          moodPulse: 'unsure',
          durationSeconds: 35 * 60,
        },
      ],
    },
    {
      sessionId: 'demo-teacher-past-2',
      classId: 'guest-class',
      className: 'Year 4 Maths',
      schoolName: 'AdaptBuddy Demo School',
      subject: 'Maths',
      yearGroup: 'Year 4',
      classCode: 'Y4-MATH-82',
      sessionStatus: 'ended',
      activityMode: 'calm',
      focusTitle: 'Calm counting circle',
      focusMessage: 'A gentle warm-up before number patterns.',
      nowStep: 'Breathe and count to ten',
      nextStep: 'Pattern hunt',
      launchedAt: new Date(now - 5 * day - 30 * 60 * 1000).toISOString(),
      endedAt: new Date(now - 5 * day).toISOString(),
      durationSeconds: 30 * 60,
      restrictLearnerVideo: true,
      restrictLearnerMic: false,
      requireScreenShareApproval: true,
      allowLearnerHandRaise: true,
      participantCount: 2,
      removedCount: 1,
      participants: [
        {
          childId: 'guest-child-a',
          childName: 'Alex A.',
          joinedAt: new Date(now - 5 * day - 28 * 60 * 1000).toISOString(),
          leftAt: new Date(now - 5 * day).toISOString(),
          lastSeenAt: new Date(now - 5 * day).toISOString(),
          status: 'left',
          moodPulse: 'okay',
          durationSeconds: 28 * 60,
        },
        {
          childId: 'guest-child-d',
          childName: 'Riley D.',
          joinedAt: new Date(now - 5 * day - 25 * 60 * 1000).toISOString(),
          leftAt: new Date(now - 5 * day - 10 * 60 * 1000).toISOString(),
          lastSeenAt: new Date(now - 5 * day - 10 * 60 * 1000).toISOString(),
          status: 'removed',
          moodPulse: 'wobbly',
          durationSeconds: 15 * 60,
        },
      ],
    },
  ];
};

const applyGuestSessionDefaults = (session: Partial<ClassLiveSession> & Pick<ClassLiveSession, 'id' | 'classId' | 'teacherId' | 'status' | 'launchedAt' | 'focusTitle' | 'focusMessage' | 'activityMode' | 'nowStep' | 'nextStep' | 'updatedAt'>): ClassLiveSession => ({
  ...DEFAULT_CLASS_SESSION_SETTINGS,
  endedAt: null,
  activeScreenSharerId: null,
  teacherScreenSharing: false,
  teacherVideoEnabled: false,
  teacherAudioEnabled: false,
  ...session,
  spotlightParticipantId: session.spotlightParticipantId ?? TEACHER_SPOTLIGHT_ID,
  restrictLearnerVideo: session.restrictLearnerVideo ?? false,
  restrictLearnerMic: session.restrictLearnerMic ?? false,
  requireScreenShareApproval: session.requireScreenShareApproval ?? true,
  allowLearnerHandRaise: session.allowLearnerHandRaise ?? true,
});

export class ClassLiveSessionService {
  static async listTeacherLiveSessions(): Promise<TeacherLiveSessionSummary[]> {
    if (!isSupabaseConfigured) {
      const store = readGuestStore();
      return Object.values(store.sessions)
        .filter((session) => session.status === 'live')
        .map((session) => ({
          sessionId: session.id,
          classId: session.classId,
          className: session.classId === 'guest-class' ? 'Year 4 Maths' : 'Classroom',
          status: session.status,
          launchedAt: session.launchedAt,
          focusTitle: session.focusTitle,
          participantCount: (store.participants[session.id] ?? []).filter((p) => p.status === 'joined')
            .length,
        }));
    }

    const client = getSupabaseClient();
    const { data, error } = await client.rpc('teacher_live_sessions');
    if (error) throw error;

    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      sessionId: String(row.session_id),
      classId: String(row.class_id),
      className: String(row.class_name),
      status: row.status as TeacherLiveSessionSummary['status'],
      launchedAt: String(row.launched_at),
      focusTitle: String(row.focus_title),
      participantCount: Number(row.participant_count ?? 0),
    }));
  }

  static async listTeacherSessionHistory(teacherId?: string): Promise<TeacherClassSessionHistoryItem[]> {
    if (!isSupabaseConfigured || teacherId?.startsWith('guest')) {
      const store = readGuestStore();
      const fromStore: TeacherClassSessionHistoryItem[] = Object.values(store.sessions)
        .filter((session) => session.status === 'ended')
        .map((session) => {
          const participants = (store.participants[session.id] ?? []).map((participant) => ({
            childId: participant.childId,
            childName: participant.childName,
            joinedAt: participant.joinedAt,
            leftAt: participant.leftAt ?? null,
            lastSeenAt: participant.lastSeenAt,
            status: participant.status,
            moodPulse: participant.moodPulse ?? null,
            durationSeconds: computeDurationSeconds(
              participant.joinedAt,
              participant.leftAt,
              session.endedAt,
              participant.lastSeenAt,
            ),
          }));
          return {
            sessionId: session.id,
            classId: session.classId,
            className: session.classId === 'guest-class' ? 'Year 4 Maths' : 'Classroom',
            schoolName: 'AdaptBuddy Demo School',
            subject: session.classId === 'guest-class' ? 'Maths' : 'General',
            yearGroup: 'Year 4',
            classCode: session.classId === 'guest-class' ? 'Y4-MATH-82' : 'DEMO',
            sessionStatus: session.status,
            activityMode: session.activityMode,
            focusTitle: session.focusTitle,
            focusMessage: session.focusMessage,
            nowStep: session.nowStep,
            nextStep: session.nextStep,
            launchedAt: session.launchedAt,
            endedAt: session.endedAt ?? null,
            durationSeconds: computeDurationSeconds(
              session.launchedAt,
              session.endedAt,
              session.endedAt,
              session.updatedAt,
            ),
            restrictLearnerVideo: session.restrictLearnerVideo,
            restrictLearnerMic: session.restrictLearnerMic,
            requireScreenShareApproval: session.requireScreenShareApproval,
            allowLearnerHandRaise: session.allowLearnerHandRaise,
            participantCount: participants.length,
            removedCount: participants.filter((p) => p.status === 'removed').length,
            participants,
          };
        })
        .sort(
          (a, b) =>
            new Date(b.endedAt || b.launchedAt).getTime() -
            new Date(a.endedAt || a.launchedAt).getTime(),
        );

      return fromStore.length > 0 ? fromStore : guestTeacherDemoHistory();
    }

    const client = getSupabaseClient();
    const { data, error } = teacherId
      ? await client.rpc('teacher_class_session_history', { p_teacher_id: teacherId })
      : await client.rpc('teacher_class_session_history');
    if (error) throw error;

    return ((data ?? []) as Record<string, unknown>[]).map((row) => {
      const rawParticipants = Array.isArray(row.participants)
        ? (row.participants as Record<string, unknown>[])
        : [];
      const participants: TeacherSessionHistoryParticipant[] = rawParticipants.map((participant) => ({
        childId: String(participant.childId ?? participant.child_id ?? ''),
        childName: String(participant.childName ?? participant.child_name ?? 'Learner'),
        joinedAt: String(participant.joinedAt ?? participant.joined_at ?? ''),
        leftAt: (participant.leftAt ?? participant.left_at ?? null) as string | null,
        lastSeenAt: String(participant.lastSeenAt ?? participant.last_seen_at ?? ''),
        status: (participant.status as TeacherSessionHistoryParticipant['status']) ?? 'left',
        moodPulse: (participant.moodPulse ?? participant.mood_pulse ?? null) as string | null,
        durationSeconds: Number(participant.durationSeconds ?? participant.duration_seconds ?? 0),
      }));

      return {
        sessionId: String(row.session_id),
        classId: String(row.class_id),
        className: String(row.class_name),
        schoolName: String(row.school_name ?? ''),
        subject: String(row.subject ?? 'General'),
        yearGroup: String(row.year_group ?? ''),
        classCode: String(row.class_code ?? ''),
        sessionStatus: (row.session_status as TeacherClassSessionHistoryItem['sessionStatus']) ?? 'ended',
        activityMode: (row.activity_mode as ClassActivityMode) ?? 'welcome',
        focusTitle: String(row.focus_title ?? 'Classroom session'),
        focusMessage: String(row.focus_message ?? ''),
        nowStep: String(row.now_step ?? ''),
        nextStep: String(row.next_step ?? ''),
        launchedAt: String(row.launched_at),
        endedAt: row.ended_at ? String(row.ended_at) : null,
        durationSeconds: Number(row.duration_seconds ?? 0),
        restrictLearnerVideo: Boolean(row.restrict_learner_video),
        restrictLearnerMic: Boolean(row.restrict_learner_mic),
        requireScreenShareApproval: Boolean(row.require_screen_share_approval ?? true),
        allowLearnerHandRaise: Boolean(row.allow_learner_hand_raise ?? true),
        participantCount: Number(row.participant_count ?? participants.length),
        removedCount: Number(row.removed_count ?? 0),
        participants,
      };
    });
  }

  static async listChildLiveClassrooms(childId: string): Promise<ChildLiveClassroom[]> {
    if (!isSupabaseConfigured || childId.startsWith('guest')) {
      const store = readGuestStore();
      const live = Object.values(store.sessions).find(
        (session) => session.status === 'live' && session.classId === 'guest-class',
      );
      return [
        {
          classId: 'guest-class',
          className: 'Year 4 Maths',
          schoolName: 'AdaptBuddy Demo School',
          subject: 'Maths',
          yearGroup: 'Year 4',
          classCode: 'Y4-MATH-82',
          teacherName: 'Ms. Rivera',
          sessionId: live?.id ?? null,
          sessionStatus: live?.status ?? null,
          launchedAt: live?.launchedAt ?? null,
          focusTitle: live?.focusTitle ?? null,
          participantCount: live
            ? (store.participants[live.id] ?? []).filter((p) => p.status === 'joined').length
            : 0,
          isLive: Boolean(live),
        },
      ];
    }

    const client = getSupabaseClient();
    const { data, error } = await client.rpc('child_live_classrooms', { p_child_id: childId });
    if (error) throw error;

    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      classId: String(row.class_id),
      className: String(row.class_name),
      schoolName: String(row.school_name ?? ''),
      subject: String(row.subject ?? 'General'),
      yearGroup: String(row.year_group ?? ''),
      classCode: String(row.class_code ?? ''),
      teacherName: String(row.teacher_name ?? 'Teacher'),
      sessionId: row.session_id ? String(row.session_id) : null,
      sessionStatus: row.session_status as ChildLiveClassroom['sessionStatus'],
      launchedAt: row.launched_at ? String(row.launched_at) : null,
      focusTitle: row.focus_title ? String(row.focus_title) : null,
      participantCount: Number(row.participant_count ?? 0),
      isLive: row.session_status === 'live' && Boolean(row.session_id),
    }));
  }

  static async listChildSessionHistory(childId: string): Promise<ChildClassSessionHistoryItem[]> {
    if (!isSupabaseConfigured || childId.startsWith('guest')) {
      const store = readGuestStore();
      const fromStore: ChildClassSessionHistoryItem[] = Object.values(store.sessions)
        .flatMap((session) => {
          const participants = store.participants[session.id] ?? [];
          return participants
            .filter(
              (participant) =>
                participant.childId === childId &&
                (session.status === 'ended' ||
                  participant.status === 'left' ||
                  participant.status === 'removed'),
            )
            .map((participant) => ({
              sessionId: session.id,
              classId: session.classId,
              className: session.classId === 'guest-class' ? 'Year 4 Maths' : 'Classroom',
              schoolName: 'AdaptBuddy Demo School',
              subject: session.classId === 'guest-class' ? 'Maths' : 'General',
              yearGroup: 'Year 4',
              classCode: session.classId === 'guest-class' ? 'Y4-MATH-82' : 'DEMO',
              teacherName: 'Ms. Rivera',
              sessionStatus: session.status,
              activityMode: session.activityMode,
              focusTitle: session.focusTitle,
              focusMessage: session.focusMessage,
              nowStep: session.nowStep,
              nextStep: session.nextStep,
              launchedAt: session.launchedAt,
              endedAt: session.endedAt ?? null,
              joinedAt: participant.joinedAt,
              leftAt: participant.leftAt ?? null,
              lastSeenAt: participant.lastSeenAt,
              participantStatus: participant.status,
              moodPulse: participant.moodPulse ?? null,
              durationSeconds: computeDurationSeconds(
                participant.joinedAt,
                participant.leftAt,
                session.endedAt,
                participant.lastSeenAt,
              ),
            }));
        })
        .sort(
          (a, b) =>
            new Date(b.endedAt || b.leftAt || b.joinedAt).getTime() -
            new Date(a.endedAt || a.leftAt || a.joinedAt).getTime(),
        );

      return fromStore.length > 0 ? fromStore : guestDemoHistory(childId);
    }

    const client = getSupabaseClient();
    const { data, error } = await client.rpc('child_class_session_history', { p_child_id: childId });
    if (error) throw error;

    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      sessionId: String(row.session_id),
      classId: String(row.class_id),
      className: String(row.class_name),
      schoolName: String(row.school_name ?? ''),
      subject: String(row.subject ?? 'General'),
      yearGroup: String(row.year_group ?? ''),
      classCode: String(row.class_code ?? ''),
      teacherName: String(row.teacher_name ?? 'Teacher'),
      sessionStatus: (row.session_status as ChildClassSessionHistoryItem['sessionStatus']) ?? 'ended',
      activityMode: (row.activity_mode as ClassActivityMode) ?? 'welcome',
      focusTitle: String(row.focus_title ?? 'Classroom session'),
      focusMessage: String(row.focus_message ?? ''),
      nowStep: String(row.now_step ?? ''),
      nextStep: String(row.next_step ?? ''),
      launchedAt: String(row.launched_at),
      endedAt: row.ended_at ? String(row.ended_at) : null,
      joinedAt: String(row.joined_at),
      leftAt: row.left_at ? String(row.left_at) : null,
      lastSeenAt: String(row.last_seen_at ?? row.joined_at),
      participantStatus:
        (row.participant_status as ChildClassSessionHistoryItem['participantStatus']) ?? 'left',
      moodPulse: (row.mood_pulse as string | null) ?? null,
      durationSeconds: Number(row.duration_seconds ?? 0),
    }));
  }

  static async launchClassSession(
    classId: string,
    config: Partial<LaunchClassroomConfig> = {},
  ): Promise<ClassLiveSession> {
    const launchConfig = { ...DEFAULT_LAUNCH_CLASSROOM_CONFIG, ...config };

    if (!isSupabaseConfigured) {
      const store = readGuestStore();
      Object.values(store.sessions).forEach((session) => {
        if (session.classId === classId && session.status === 'live') {
          session.status = 'ended';
          session.endedAt = new Date().toISOString();
        }
      });
      const session: ClassLiveSession = applyGuestSessionDefaults({
        id: `guest-session-${Date.now()}`,
        classId,
        teacherId: 'guest-teacher',
        status: 'live',
        launchedAt: new Date().toISOString(),
        focusTitle: launchConfig.focusTitle,
        focusMessage: launchConfig.focusMessage,
        activityMode: 'welcome',
        nowStep: 'Say hello and get comfortable',
        nextStep: 'We will start our learning activity together',
        updatedAt: new Date().toISOString(),
        spotlightParticipantId: launchConfig.spotlightParticipantId,
        restrictLearnerVideo: launchConfig.restrictLearnerVideo,
        restrictLearnerMic: launchConfig.restrictLearnerMic,
        requireScreenShareApproval: launchConfig.requireScreenShareApproval,
        allowLearnerHandRaise: launchConfig.allowLearnerHandRaise,
      });
      store.sessions[session.id] = session;
      store.participants[session.id] = [];
      writeGuestStore(store);
      return session;
    }

    const client = getSupabaseClient();
    const { data, error } = await client.rpc('launch_class_session', {
      p_class_id: classId,
      p_focus_title: launchConfig.focusTitle,
      p_focus_message: launchConfig.focusMessage,
    });
    if (error) throw error;

    const session = mapSession(data as Record<string, unknown>);
    await ClassLiveSessionService.updateSessionSettings(session.id, {
      spotlightParticipantId: launchConfig.spotlightParticipantId,
      restrictLearnerVideo: launchConfig.restrictLearnerVideo,
      restrictLearnerMic: launchConfig.restrictLearnerMic,
      requireScreenShareApproval: launchConfig.requireScreenShareApproval,
      allowLearnerHandRaise: launchConfig.allowLearnerHandRaise,
    });
    return ClassLiveSessionService.getSessionSnapshot(session.id).then((snap) => snap!.session);
  }

  static async endClassSession(sessionId: string): Promise<void> {
    if (!isSupabaseConfigured) {
      const store = readGuestStore();
      const session = store.sessions[sessionId];
      const endedAt = new Date().toISOString();
      if (session) {
        session.status = 'ended';
        session.endedAt = endedAt;
      }
      (store.participants[sessionId] ?? []).forEach((participant) => {
        if (participant.status === 'joined') {
          participant.status = 'left';
          participant.leftAt = endedAt;
          participant.lastSeenAt = endedAt;
          participant.handRaised = false;
        }
      });
      writeGuestStore(store);
      return;
    }

    const client = getSupabaseClient();
    const { error } = await client.rpc('end_class_session', { p_session_id: sessionId });
    if (error) throw error;
  }

  static async joinClassSession(sessionId: string, childId: string, childName: string): Promise<void> {
    if (!isSupabaseConfigured || childId.startsWith('guest')) {
      const store = readGuestStore();
      const session = store.sessions[sessionId];
      if (!session || session.status !== 'live') throw new Error('This classroom is not live right now');

      const list = store.participants[sessionId] ?? [];
      const existing = list.find((p) => p.childId === childId);
      if (existing) {
        existing.status = 'joined';
        existing.leftAt = null;
        existing.lastSeenAt = new Date().toISOString();
      } else {
        list.push({
          id: `guest-participant-${childId}`,
          childId,
          childName,
          joinedAt: new Date().toISOString(),
          leftAt: null,
          lastSeenAt: new Date().toISOString(),
          moodPulse: null,
          handRaised: false,
          videoEnabled: false,
          audioEnabled: false,
          screenShareStatus: 'none',
          screenSharing: false,
          status: 'joined',
        });
      }
      store.participants[sessionId] = list;
      writeGuestStore(store);
      return;
    }

    const client = getSupabaseClient();
    const { error } = await client.rpc('join_class_session', { p_session_id: sessionId });
    if (error) throw error;
  }

  static async leaveClassSession(sessionId: string, childId?: string): Promise<void> {
    if (!isSupabaseConfigured || childId?.startsWith('guest')) {
      const store = readGuestStore();
      const leftAt = new Date().toISOString();
      const list = store.participants[sessionId] ?? [];
      list.forEach((p) => {
        if (p.status === 'joined' && (!childId || p.childId === childId)) {
          p.status = 'left';
          p.leftAt = leftAt;
          p.lastSeenAt = leftAt;
          p.handRaised = false;
          p.screenSharing = false;
          p.screenShareStatus = 'none';
        }
      });
      store.participants[sessionId] = list;
      writeGuestStore(store);
      return;
    }

    const client = getSupabaseClient();
    const { error } = await client.rpc('leave_class_session', { p_session_id: sessionId });
    if (error) throw error;
  }

  static async updateSessionState(
    sessionId: string,
    patch: Partial<{
      focusTitle: string;
      focusMessage: string;
      activityMode: ClassActivityMode;
      nowStep: string;
      nextStep: string;
    }>,
  ): Promise<ClassLiveSession> {
    if (!isSupabaseConfigured) {
      const store = readGuestStore();
      const session = store.sessions[sessionId];
      if (!session) throw new Error('Session not found');
      Object.assign(session, {
        focusTitle: patch.focusTitle ?? session.focusTitle,
        focusMessage: patch.focusMessage ?? session.focusMessage,
        activityMode: patch.activityMode ?? session.activityMode,
        nowStep: patch.nowStep ?? session.nowStep,
        nextStep: patch.nextStep ?? session.nextStep,
        updatedAt: new Date().toISOString(),
      });
      writeGuestStore(store);
      return session;
    }

    const client = getSupabaseClient();
    const { data, error } = await client.rpc('update_class_session_state', {
      p_session_id: sessionId,
      p_focus_title: patch.focusTitle ?? null,
      p_focus_message: patch.focusMessage ?? null,
      p_activity_mode: patch.activityMode ?? null,
      p_now_step: patch.nowStep ?? null,
      p_next_step: patch.nextStep ?? null,
    });
    if (error) throw error;
    return mapSession(data as Record<string, unknown>);
  }

  static async updateSessionSettings(
    sessionId: string,
    patch: Partial<ClassSessionSettings>,
  ): Promise<ClassLiveSession> {
    if (!isSupabaseConfigured) {
      const store = readGuestStore();
      const session = store.sessions[sessionId];
      if (!session) throw new Error('Session not found');
      Object.assign(session, {
        spotlightParticipantId: patch.spotlightParticipantId ?? session.spotlightParticipantId,
        restrictLearnerVideo: patch.restrictLearnerVideo ?? session.restrictLearnerVideo,
        restrictLearnerMic: patch.restrictLearnerMic ?? session.restrictLearnerMic,
        requireScreenShareApproval: patch.requireScreenShareApproval ?? session.requireScreenShareApproval,
        allowLearnerHandRaise: patch.allowLearnerHandRaise ?? session.allowLearnerHandRaise,
        updatedAt: new Date().toISOString(),
      });
      writeGuestStore(store);
      return session;
    }

    const client = getSupabaseClient();
    const { data, error } = await client.rpc('update_class_session_settings', {
      p_session_id: sessionId,
      p_spotlight_participant_id: patch.spotlightParticipantId ?? null,
      p_restrict_learner_video: patch.restrictLearnerVideo ?? null,
      p_restrict_learner_mic: patch.restrictLearnerMic ?? null,
      p_require_screen_share_approval: patch.requireScreenShareApproval ?? null,
      p_allow_learner_hand_raise: patch.allowLearnerHandRaise ?? null,
    });
    if (error) throw error;
    return mapSession(data as Record<string, unknown>);
  }

  static async updateTeacherMedia(
    sessionId: string,
    patch: { videoEnabled?: boolean; audioEnabled?: boolean },
  ): Promise<void> {
    if (!isSupabaseConfigured) {
      const store = readGuestStore();
      const session = store.sessions[sessionId];
      if (!session) throw new Error('Session not found');
      if (patch.videoEnabled !== undefined) session.teacherVideoEnabled = patch.videoEnabled;
      if (patch.audioEnabled !== undefined) session.teacherAudioEnabled = patch.audioEnabled;
      session.updatedAt = new Date().toISOString();
      writeGuestStore(store);
      return;
    }

    const client = getSupabaseClient();
    const { error } = await client.rpc('update_class_session_teacher_media', {
      p_session_id: sessionId,
      p_video_enabled: patch.videoEnabled ?? null,
      p_audio_enabled: patch.audioEnabled ?? null,
    });
    if (error) throw error;
  }

  static async sendParticipantPulse(
    sessionId: string,
    patch: {
      moodPulse?: string;
      handRaised?: boolean;
      videoEnabled?: boolean;
      audioEnabled?: boolean;
    },
    childId?: string,
  ): Promise<void> {
    if (!isSupabaseConfigured) {
      const store = readGuestStore();
      const list = store.participants[sessionId] ?? [];
      const participant = childId
        ? list.find((p) => p.childId === childId && p.status === 'joined')
        : list.find((p) => p.status === 'joined');
      if (participant) {
        if (patch.moodPulse !== undefined) participant.moodPulse = patch.moodPulse;
        if (patch.handRaised !== undefined) participant.handRaised = patch.handRaised;
        if (patch.videoEnabled !== undefined) participant.videoEnabled = patch.videoEnabled;
        if (patch.audioEnabled !== undefined) participant.audioEnabled = patch.audioEnabled;
        participant.lastSeenAt = new Date().toISOString();
      }
      writeGuestStore(store);
      return;
    }

    const client = getSupabaseClient();
    const { error } = await client.rpc('class_session_participant_pulse', {
      p_session_id: sessionId,
      p_mood_pulse: patch.moodPulse ?? null,
      p_hand_raised: patch.handRaised ?? null,
      p_video_enabled: patch.videoEnabled ?? null,
      p_audio_enabled: patch.audioEnabled ?? null,
    });
    if (error) throw error;
  }

  static async requestScreenShare(sessionId: string, childId?: string): Promise<void> {
    if (!isSupabaseConfigured) {
      const store = readGuestStore();
      const session = store.sessions[sessionId];
      if (!session) throw new Error('Session not found');
      if (session.activeScreenSharerId) throw new Error('Someone is already sharing their screen');
      const list = store.participants[sessionId] ?? [];
      const participant = list.find((p) => p.childId === (childId ?? 'guest-child') && p.status === 'joined');
      if (!participant) throw new Error('You are not in this classroom');
      participant.screenShareStatus = 'pending';
      participant.lastSeenAt = new Date().toISOString();
      writeGuestStore(store);
      return;
    }

    const client = getSupabaseClient();
    const { error } = await client.rpc('request_screen_share', { p_session_id: sessionId });
    if (error) throw error;
  }

  static async respondScreenShareRequest(
    sessionId: string,
    childId: string,
    approved: boolean,
  ): Promise<void> {
    if (!isSupabaseConfigured) {
      const store = readGuestStore();
      const list = store.participants[sessionId] ?? [];
      const participant = list.find((p) => p.childId === childId && p.screenShareStatus === 'pending');
      if (!participant) throw new Error('Screen share request not found');
      participant.screenShareStatus = approved ? 'approved' : 'none';
      participant.lastSeenAt = new Date().toISOString();
      writeGuestStore(store);
      return;
    }

    const client = getSupabaseClient();
    const { error } = await client.rpc('respond_screen_share_request', {
      p_session_id: sessionId,
      p_child_id: childId,
      p_approved: approved,
    });
    if (error) throw error;
  }

  static async setScreenShareState(
    sessionId: string,
    active: boolean,
    asTeacher: boolean,
    userId?: string,
  ): Promise<void> {
    if (!isSupabaseConfigured) {
      const store = readGuestStore();
      const session = store.sessions[sessionId];
      if (!session) throw new Error('Session not found');
      const uid = userId ?? (asTeacher ? 'guest-teacher' : 'guest-child');

      if (asTeacher) {
        session.teacherScreenSharing = active;
        session.activeScreenSharerId = active ? uid : null;
        if (active) session.spotlightParticipantId = TEACHER_SPOTLIGHT_ID;
      } else {
        const list = store.participants[sessionId] ?? [];
        const participant = list.find((p) => p.childId === uid && p.status === 'joined');
        if (!participant) throw new Error('Participant not found');
        if (active && participant.screenShareStatus !== 'approved' && participant.screenShareStatus !== 'active') {
          throw new Error('Screen share not approved yet');
        }
        participant.screenShareStatus = active ? 'active' : 'none';
        participant.screenSharing = active;
        session.activeScreenSharerId = active ? uid : null;
        if (active) session.spotlightParticipantId = uid;
      }
      session.updatedAt = new Date().toISOString();
      writeGuestStore(store);
      return;
    }

    const client = getSupabaseClient();
    const { error } = await client.rpc('set_screen_share_state', {
      p_session_id: sessionId,
      p_active: active,
      p_as_teacher: asTeacher,
    });
    if (error) throw error;
  }

  static async removeParticipant(sessionId: string, childId: string): Promise<void> {
    if (!isSupabaseConfigured) {
      const store = readGuestStore();
      const session = store.sessions[sessionId];
      const list = store.participants[sessionId] ?? [];
      const participant = list.find((p) => p.childId === childId && p.status === 'joined');
      if (participant) {
        const removedAt = new Date().toISOString();
        participant.status = 'removed';
        participant.leftAt = removedAt;
        participant.lastSeenAt = removedAt;
        participant.handRaised = false;
        participant.screenShareStatus = 'none';
        participant.screenSharing = false;
      }
      if (session?.activeScreenSharerId === childId) {
        session.activeScreenSharerId = null;
        session.spotlightParticipantId = TEACHER_SPOTLIGHT_ID;
      }
      writeGuestStore(store);
      return;
    }

    const client = getSupabaseClient();
    const { error } = await client.rpc('remove_session_participant', {
      p_session_id: sessionId,
      p_child_id: childId,
    });
    if (error) throw error;
  }

  static async getSessionSnapshot(sessionId: string): Promise<ClassSessionSnapshot | null> {
    if (!isSupabaseConfigured) {
      const store = readGuestStore();
      const session = store.sessions[sessionId];
      if (!session) return null;
      return {
        session: applyGuestSessionDefaults(session),
        classInfo: {
          className: session.classId === 'guest-class' ? 'Year 4 Maths' : 'Classroom',
          schoolName: 'AdaptBuddy Demo School',
          subject: 'Maths',
          yearGroup: 'Year 4',
          classCode: 'Y4-MATH-82',
        },
        participants: (store.participants[sessionId] ?? []).filter((p) => p.status === 'joined'),
      };
    }

    const client = getSupabaseClient();
    const { data, error } = await client.rpc('class_session_snapshot', { p_session_id: sessionId });
    if (error) throw error;

    const payload = data as { found?: boolean; session?: Record<string, unknown>; class?: Record<string, unknown>; participants?: Record<string, unknown>[] };
    if (!payload?.found || !payload.session) return null;

    return {
      session: mapSession(payload.session),
      classInfo: {
        className: String(payload.class?.className ?? ''),
        schoolName: String(payload.class?.schoolName ?? ''),
        subject: String(payload.class?.subject ?? ''),
        yearGroup: String(payload.class?.yearGroup ?? ''),
        classCode: String(payload.class?.classCode ?? ''),
      },
      participants: (payload.participants ?? []).map(mapParticipant),
    };
  }
}
