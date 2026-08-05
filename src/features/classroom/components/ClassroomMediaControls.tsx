import React from 'react';
import { Loader2, Mic, MicOff, MonitorUp, Video, VideoOff } from 'lucide-react';

interface ClassroomMediaControlsProps {
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenSharing?: boolean;
  canToggleVideo: boolean;
  canToggleMic: boolean;
  canToggleScreenShare?: boolean;
  screenShareLabel?: string;
  busy?: boolean;
  restrictVideo?: boolean;
  restrictMic?: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreenShare?: () => void;
}

const ClassroomMediaControls: React.FC<ClassroomMediaControlsProps> = ({
  videoEnabled,
  audioEnabled,
  screenSharing = false,
  canToggleVideo,
  canToggleMic,
  canToggleScreenShare = true,
  screenShareLabel = 'Share screen',
  busy = false,
  restrictVideo = false,
  restrictMic = false,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
}) => (
  <div className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-soft dark:border-gray-800 dark:bg-gray-900/85">
    <p className="text-xs font-black uppercase tracking-[0.16em] text-adapt-indigo dark:text-adapt-cyan">
      Your camera, mic &amp; screen
    </p>
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        disabled={!canToggleVideo || busy}
        onClick={onToggleVideo}
        title={restrictVideo ? 'Your teacher has locked learner cameras' : undefined}
        className={`inline-flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
          videoEnabled
            ? 'bg-adapt-indigo text-white dark:bg-adapt-cyan dark:text-gray-950'
            : 'border border-slate-200 bg-white text-slate-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200'
        }`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : videoEnabled ? <Video className="h-4 w-4" aria-hidden /> : <VideoOff className="h-4 w-4" aria-hidden />}
        {videoEnabled ? 'Camera on' : 'Camera off'}
      </button>

      <button
        type="button"
        disabled={!canToggleMic || busy}
        onClick={onToggleAudio}
        title={restrictMic ? 'Your teacher has locked learner microphones' : undefined}
        className={`inline-flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
          audioEnabled
            ? 'bg-emerald-600 text-white'
            : 'border border-slate-200 bg-white text-slate-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200'
        }`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : audioEnabled ? <Mic className="h-4 w-4" aria-hidden /> : <MicOff className="h-4 w-4" aria-hidden />}
        {audioEnabled ? 'Mic on' : 'Mic off'}
      </button>

      {onToggleScreenShare && (
        <button
          type="button"
          disabled={!canToggleScreenShare || busy}
          onClick={onToggleScreenShare}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[160px] ${
            screenSharing
              ? 'bg-sky-600 text-white'
              : 'border border-slate-200 bg-white text-slate-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200'
          }`}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <MonitorUp className="h-4 w-4" aria-hidden />}
          {screenSharing ? 'Stop sharing' : screenShareLabel}
        </button>
      )}
    </div>

    {(restrictVideo || restrictMic) && (
      <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
        {restrictVideo && restrictMic
          ? 'Your teacher has paused learner cameras and microphones.'
          : restrictVideo
            ? 'Your teacher has paused learner cameras for now.'
            : 'Your teacher has paused learner microphones for now.'}
      </p>
    )}
  </div>
);

export default ClassroomMediaControls;
