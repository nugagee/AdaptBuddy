import React from 'react';
import {
  Hand,
  MicOff,
  MonitorUp,
  Settings,
  Star,
  UserMinus,
  VideoOff,
  X,
} from 'lucide-react';
import type {
  ClassSessionSettings,
  ClassSessionSnapshot,
  SpotlightParticipantId,
} from 'features/classroom/types/classLiveSession.types';
import { TEACHER_SPOTLIGHT_ID } from 'features/classroom/types/classLiveSession.types';

interface ClassroomSettingsPanelProps {
  open: boolean;
  snapshot: ClassSessionSnapshot;
  saving?: boolean;
  onClose: () => void;
  onChange: (patch: Partial<ClassSessionSettings>) => void;
  onSpotlight: (participantId: SpotlightParticipantId) => void;
  onApproveScreenShare?: (childId: string) => void;
  onDenyScreenShare?: (childId: string) => void;
  onRemoveParticipant?: (childId: string) => void;
}

const ClassroomSettingsPanel: React.FC<ClassroomSettingsPanelProps> = ({
  open,
  snapshot,
  saving = false,
  onClose,
  onChange,
  onSpotlight,
  onApproveScreenShare,
  onDenyScreenShare,
  onRemoveParticipant,
}) => {
  if (!open) return null;

  const { session, participants } = snapshot;
  const spotlightId = session.spotlightParticipantId;
  const joined = participants.filter((participant) => participant.status === 'joined');
  const pendingScreenShares = joined.filter((participant) => participant.screenShareStatus === 'pending');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <button type="button" aria-label="Close settings" className="absolute inset-0" onClick={onClose} />
      <section className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto animate-slide-up rounded-3xl border border-white/70 bg-white p-5 shadow-card dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
              <Settings className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-adapt-navy dark:text-gray-100">Classroom settings</h2>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                Update controls anytime during the live session.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 p-2 text-slate-500 dark:border-gray-700 dark:text-gray-300"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {pendingScreenShares.length > 0 && (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/50 dark:bg-sky-950/30">
              <div className="flex items-center gap-2 text-sky-800 dark:text-sky-100">
                <MonitorUp className="h-5 w-5" aria-hidden />
                <h3 className="font-extrabold">Screen share requests</h3>
              </div>
              <ul className="mt-3 space-y-2">
                {pendingScreenShares.map((participant) => (
                  <li
                    key={participant.childId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2 dark:bg-gray-900/80"
                  >
                    <span className="text-sm font-bold">{participant.childName}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => onDenyScreenShare?.(participant.childId)}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-black dark:border-gray-700"
                      >
                        Deny
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => onApproveScreenShare?.(participant.childId)}
                        className="rounded-xl bg-adapt-indigo px-3 py-1.5 text-xs font-black text-white dark:bg-adapt-cyan dark:text-gray-950"
                      >
                        Approve
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-950">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-gray-400">
              Spotlight
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => onSpotlight(TEACHER_SPOTLIGHT_ID)}
                className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-black transition ${
                  spotlightId === TEACHER_SPOTLIGHT_ID
                    ? 'bg-amber-400 text-amber-950'
                    : 'border border-slate-200 bg-white text-slate-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
                }`}
              >
                <Star className="h-4 w-4" aria-hidden />
                Teacher
              </button>
              {joined.map((participant) => (
                <button
                  key={participant.childId}
                  type="button"
                  disabled={saving}
                  onClick={() => onSpotlight(participant.childId)}
                  className={`rounded-2xl px-3 py-2 text-sm font-black transition ${
                    spotlightId === participant.childId
                      ? 'bg-amber-400 text-amber-950'
                      : 'border border-slate-200 bg-white text-slate-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
                  }`}
                >
                  {participant.childName}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
            <input
              type="checkbox"
              checked={session.restrictLearnerVideo}
              disabled={saving}
              onChange={(event) => onChange({ restrictLearnerVideo: event.target.checked })}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-adapt-indigo"
            />
            <span>
              <span className="flex items-center gap-2 font-extrabold text-adapt-navy dark:text-gray-100">
                <VideoOff className="h-4 w-4" aria-hidden />
                Restrict learner cameras
              </span>
              <span className="mt-1 block text-sm text-slate-500 dark:text-gray-400">
                Learners cannot turn their camera on until you allow it again.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
            <input
              type="checkbox"
              checked={session.restrictLearnerMic}
              disabled={saving}
              onChange={(event) => onChange({ restrictLearnerMic: event.target.checked })}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-adapt-indigo"
            />
            <span>
              <span className="flex items-center gap-2 font-extrabold text-adapt-navy dark:text-gray-100">
                <MicOff className="h-4 w-4" aria-hidden />
                Restrict learner microphones
              </span>
              <span className="mt-1 block text-sm text-slate-500 dark:text-gray-400">
                Prevents learners from unmuting themselves.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
            <input
              type="checkbox"
              checked={session.requireScreenShareApproval}
              disabled={saving}
              onChange={(event) => onChange({ requireScreenShareApproval: event.target.checked })}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-adapt-indigo"
            />
            <span>
              <span className="flex items-center gap-2 font-extrabold text-adapt-navy dark:text-gray-100">
                <MonitorUp className="h-4 w-4" aria-hidden />
                Require screen share approval
              </span>
              <span className="mt-1 block text-sm text-slate-500 dark:text-gray-400">
                Learners must request permission before presenting their screen.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
            <input
              type="checkbox"
              checked={session.allowLearnerHandRaise}
              disabled={saving}
              onChange={(event) => onChange({ allowLearnerHandRaise: event.target.checked })}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-adapt-indigo"
            />
            <span>
              <span className="flex items-center gap-2 font-extrabold text-adapt-navy dark:text-gray-100">
                <Hand className="h-4 w-4" aria-hidden />
                Allow hand raising
              </span>
              <span className="mt-1 block text-sm text-slate-500 dark:text-gray-400">
                Learners can raise their hand during the lesson.
              </span>
            </span>
          </label>

          {joined.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-950">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Learners in room
              </p>
              <ul className="mt-3 space-y-2">
                {joined.map((participant) => (
                  <li
                    key={participant.childId}
                    className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 dark:bg-gray-900"
                  >
                    <div>
                      <p className="text-sm font-bold text-adapt-navy dark:text-gray-100">
                        {participant.childName}
                      </p>
                      {participant.screenShareStatus === 'active' && (
                        <p className="text-xs font-semibold text-sky-600 dark:text-sky-300">Sharing screen</p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => onRemoveParticipant?.(participant.childId)}
                      className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
                    >
                      <UserMinus className="h-3.5 w-3.5" aria-hidden />
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ClassroomSettingsPanel;
