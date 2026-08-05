import React, { useState } from 'react';
import { Loader2, Rocket, Settings, Video, X } from 'lucide-react';
import {
  DEFAULT_LAUNCH_CLASSROOM_CONFIG,
  type LaunchClassroomConfig,
} from 'features/classroom/types/classLiveSession.types';

interface LaunchClassroomModalProps {
  open: boolean;
  className: string;
  launching?: boolean;
  onClose: () => void;
  onLaunch: (config: LaunchClassroomConfig) => void;
}

const LaunchClassroomModal: React.FC<LaunchClassroomModalProps> = ({
  open,
  className,
  launching = false,
  onClose,
  onLaunch,
}) => {
  const [config, setConfig] = useState<LaunchClassroomConfig>(DEFAULT_LAUNCH_CLASSROOM_CONFIG);

  if (!open) return null;

  const update = (patch: Partial<LaunchClassroomConfig>) =>
    setConfig((current) => ({ ...current, ...patch }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <button type="button" aria-label="Close" className="absolute inset-0" onClick={onClose} />
      <section className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto animate-slide-up rounded-3xl border border-white/70 bg-white p-6 shadow-card dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
              <Rocket className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">Launch classroom</h2>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                Set up {className} before learners can join.
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

        <div className="mt-6 space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-950">
            <p className="text-xs font-black uppercase tracking-wider text-adapt-indigo dark:text-adapt-cyan">
              Welcome message
            </p>
            <div className="mt-3 space-y-3">
              <input
                value={config.focusTitle}
                onChange={(event) => update({ focusTitle: event.target.value })}
                placeholder="Focus title"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-adapt-indigo dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
              <textarea
                value={config.focusMessage}
                onChange={(event) => update({ focusMessage: event.target.value })}
                placeholder="Message for learners when they arrive"
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-adapt-indigo dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
              <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Learner controls
              </p>
            </div>

            <div className="mt-3 space-y-3">
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <input
                  type="checkbox"
                  checked={config.restrictLearnerVideo}
                  onChange={(event) => update({ restrictLearnerVideo: event.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-adapt-indigo"
                />
                <span>
                  <span className="font-extrabold text-adapt-navy dark:text-gray-100">Start with cameras off</span>
                  <span className="mt-1 block text-sm text-slate-500 dark:text-gray-400">
                    Learners cannot turn on their camera until you allow it.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <input
                  type="checkbox"
                  checked={config.restrictLearnerMic}
                  onChange={(event) => update({ restrictLearnerMic: event.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-adapt-indigo"
                />
                <span>
                  <span className="font-extrabold text-adapt-navy dark:text-gray-100">Start with microphones muted</span>
                  <span className="mt-1 block text-sm text-slate-500 dark:text-gray-400">
                    Keeps the room calm at the start of the lesson.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <input
                  type="checkbox"
                  checked={config.requireScreenShareApproval}
                  onChange={(event) => update({ requireScreenShareApproval: event.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-adapt-indigo"
                />
                <span>
                  <span className="font-extrabold text-adapt-navy dark:text-gray-100">Approve screen sharing</span>
                  <span className="mt-1 block text-sm text-slate-500 dark:text-gray-400">
                    Learners must ask before they can present their screen.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <input
                  type="checkbox"
                  checked={config.allowLearnerHandRaise}
                  onChange={(event) => update({ allowLearnerHandRaise: event.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-adapt-indigo"
                />
                <span>
                  <span className="font-extrabold text-adapt-navy dark:text-gray-100">Allow hand raising</span>
                  <span className="mt-1 block text-sm text-slate-500 dark:text-gray-400">
                    Learners can raise their hand to get your attention.
                  </span>
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={launching || !config.focusTitle.trim()}
            onClick={() => onLaunch(config)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-adapt-navy px-4 py-3 text-sm font-black text-white disabled:opacity-60 dark:bg-adapt-cyan dark:text-gray-950"
          >
            {launching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Video className="h-4 w-4" aria-hidden />}
            {launching ? 'Launching…' : 'Launch classroom'}
          </button>
        </div>
      </section>
    </div>
  );
};

export default LaunchClassroomModal;
