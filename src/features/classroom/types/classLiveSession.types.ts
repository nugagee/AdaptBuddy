export type ClassActivityMode = 'welcome' | 'learn' | 'calm' | 'check_in' | 'break';
export type ClassSessionStatus = 'live' | 'ended';
export type ClassroomRole = 'teacher' | 'learner';
export type ScreenShareStatus = 'none' | 'pending' | 'approved' | 'active';
export type ParticipantStatus = 'joined' | 'left' | 'removed';

/** Spotlight target: `teacher` or a learner childId */
export type SpotlightParticipantId = 'teacher' | string;

export interface ClassSessionSettings {
  spotlightParticipantId: SpotlightParticipantId;
  restrictLearnerVideo: boolean;
  restrictLearnerMic: boolean;
  requireScreenShareApproval: boolean;
  allowLearnerHandRaise: boolean;
}

export interface LaunchClassroomConfig extends ClassSessionSettings {
  focusTitle: string;
  focusMessage: string;
}

export interface ClassLiveSession {
  id: string;
  classId: string;
  teacherId: string;
  status: ClassSessionStatus;
  launchedAt: string;
  endedAt?: string | null;
  focusTitle: string;
  focusMessage: string;
  activityMode: ClassActivityMode;
  nowStep: string;
  nextStep: string;
  updatedAt: string;
  spotlightParticipantId: SpotlightParticipantId;
  restrictLearnerVideo: boolean;
  restrictLearnerMic: boolean;
  requireScreenShareApproval: boolean;
  allowLearnerHandRaise: boolean;
  activeScreenSharerId: string | null;
  teacherScreenSharing: boolean;
  teacherVideoEnabled: boolean;
  teacherAudioEnabled: boolean;
}

export interface ClassSessionParticipant {
  id: string;
  childId: string;
  childName: string;
  joinedAt: string;
  leftAt?: string | null;
  lastSeenAt: string;
  moodPulse?: string | null;
  handRaised: boolean;
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenShareStatus: ScreenShareStatus;
  screenSharing: boolean;
  status: ParticipantStatus;
}

export interface ChildClassSessionHistoryItem {
  sessionId: string;
  classId: string;
  className: string;
  schoolName: string;
  subject: string;
  yearGroup: string;
  classCode: string;
  teacherName: string;
  sessionStatus: ClassSessionStatus;
  activityMode: ClassActivityMode;
  focusTitle: string;
  focusMessage: string;
  nowStep: string;
  nextStep: string;
  launchedAt: string;
  endedAt: string | null;
  joinedAt: string;
  leftAt: string | null;
  lastSeenAt: string;
  participantStatus: ParticipantStatus;
  moodPulse: string | null;
  durationSeconds: number;
}

export interface ClassSessionSnapshot {
  session: ClassLiveSession;
  classInfo: {
    className: string;
    schoolName: string;
    subject: string;
    yearGroup: string;
    classCode: string;
  };
  participants: ClassSessionParticipant[];
}

export interface ClassroomVideoTile {
  id: string;
  name: string;
  role: ClassroomRole;
  stream: MediaStream | null;
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenSharing?: boolean;
  handRaised?: boolean;
  isLocal?: boolean;
}

export interface ChildLiveClassroom {
  classId: string;
  className: string;
  schoolName: string;
  subject: string;
  yearGroup: string;
  classCode: string;
  teacherName: string;
  sessionId: string | null;
  sessionStatus: ClassSessionStatus | null;
  launchedAt: string | null;
  focusTitle: string | null;
  participantCount: number;
  isLive: boolean;
}

export interface TeacherLiveSessionSummary {
  sessionId: string;
  classId: string;
  className: string;
  status: ClassSessionStatus;
  launchedAt: string;
  focusTitle: string;
  participantCount: number;
}

export interface TeacherSessionHistoryParticipant {
  childId: string;
  childName: string;
  joinedAt: string;
  leftAt: string | null;
  lastSeenAt: string;
  status: ParticipantStatus;
  moodPulse: string | null;
  durationSeconds: number;
}

export interface TeacherClassSessionHistoryItem {
  sessionId: string;
  classId: string;
  className: string;
  schoolName: string;
  subject: string;
  yearGroup: string;
  classCode: string;
  sessionStatus: ClassSessionStatus;
  activityMode: ClassActivityMode;
  focusTitle: string;
  focusMessage: string;
  nowStep: string;
  nextStep: string;
  launchedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  restrictLearnerVideo: boolean;
  restrictLearnerMic: boolean;
  requireScreenShareApproval: boolean;
  allowLearnerHandRaise: boolean;
  participantCount: number;
  removedCount: number;
  participants: TeacherSessionHistoryParticipant[];
}

export const DEFAULT_CLASS_SESSION_SETTINGS: ClassSessionSettings = {
  spotlightParticipantId: 'teacher',
  restrictLearnerVideo: false,
  restrictLearnerMic: false,
  requireScreenShareApproval: true,
  allowLearnerHandRaise: true,
};

export const DEFAULT_LAUNCH_CLASSROOM_CONFIG: LaunchClassroomConfig = {
  ...DEFAULT_CLASS_SESSION_SETTINGS,
  focusTitle: 'Our classroom is live',
  focusMessage: 'Join when you feel ready — we will take it step by step.',
};

export const ACTIVITY_MODE_LABELS: Record<ClassActivityMode, string> = {
  welcome: 'Welcome',
  learn: 'Learning time',
  calm: 'Calm moment',
  check_in: 'Feelings check-in',
  break: 'Sensory break',
};

export const MOOD_PULSE_OPTIONS = [
  { id: 'great', label: 'Great', emoji: '😊' },
  { id: 'okay', label: 'Okay', emoji: '🙂' },
  { id: 'unsure', label: 'Unsure', emoji: '😐' },
  { id: 'wobbly', label: 'Wobbly', emoji: '😟' },
  { id: 'need_help', label: 'Need help', emoji: '🆘' },
] as const;

export const TEACHER_SPOTLIGHT_ID = 'teacher' as const;
