import React, { useEffect, useState } from 'react';
import { Pause, Play, X } from 'lucide-react';
import { useChildProgressStore } from 'features/child/store/childProgressStore';

interface FocusTimerModalProps {
  durationMinutes: number;
  onClose: () => void;
  onComplete: () => void;
}

const FocusTimerModal: React.FC<FocusTimerModalProps> = ({
  durationMinutes,
  onClose,
  onComplete,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const [running, setRunning] = useState(false);
  const addFocusMinutes = useChildProgressStore((s) => s.addFocusMinutes);

  useEffect(() => {
    if (!running || secondsLeft <= 0) return undefined;

    const timer = window.setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [running, secondsLeft]);

  useEffect(() => {
    if (secondsLeft === 0 && running) {
      setRunning(false);
      addFocusMinutes(durationMinutes);
      onComplete();
    }
  }, [secondsLeft, running, durationMinutes, addFocusMinutes, onComplete]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const pct = ((durationMinutes * 60 - secondsLeft) / (durationMinutes * 60)) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-adapt-navy dark:text-gray-100">Focus Sprint</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-gray-800"
            aria-label="Close focus timer"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="relative mx-auto mb-6 flex h-40 w-40 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36" aria-hidden>
            <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-slate-200 dark:stroke-gray-700" strokeWidth="2" />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              className="stroke-adapt-indigo transition-all"
              strokeWidth="2"
              strokeDasharray={`${(pct / 100) * 97.4} 97.4`}
              strokeLinecap="round"
            />
          </svg>
          <span className="text-3xl font-black tabular-nums text-adapt-navy dark:text-gray-100">
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
        </div>

        <p className="mb-6 text-center text-sm text-slate-500">
          One goal. One sprint. You&apos;ve got this.
        </p>

        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-adapt-indigo to-adapt-teal py-3.5 font-bold text-white"
        >
          {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          {running ? 'Pause' : 'Start Sprint'}
        </button>
      </div>
    </div>
  );
};

export default FocusTimerModal;
