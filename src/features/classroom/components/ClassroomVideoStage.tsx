import React, { useEffect, useMemo, useRef } from 'react';
import { MicOff, MonitorUp, Star, User, Video, VideoOff } from 'lucide-react';
import { getLiveVideoTrack } from 'features/classroom/services/classroomMedia';
import type { ClassroomVideoTile, SpotlightParticipantId } from 'features/classroom/types/classLiveSession.types';
import { TEACHER_SPOTLIGHT_ID } from 'features/classroom/types/classLiveSession.types';

interface ClassroomVideoStageProps {
  tiles: ClassroomVideoTile[];
  spotlightId: SpotlightParticipantId;
  teacherId: string;
  role: 'teacher' | 'learner';
  onSpotlight?: (participantId: SpotlightParticipantId) => void;
}

const VideoTile: React.FC<{
  tile: ClassroomVideoTile;
  large?: boolean;
  spotlight?: boolean;
  onSpotlight?: () => void;
  showSpotlightAction?: boolean;
}> = ({ tile, large = false, spotlight = false, onSpotlight, showSpotlightAction = false }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasLiveVideo = Boolean(tile.stream && tile.videoEnabled && getLiveVideoTrack(tile.stream));

  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;
    if (hasLiveVideo && tile.stream) {
      if (node.srcObject !== tile.stream) {
        node.srcObject = tile.stream;
      }
      void node.play().catch(() => undefined);
    } else if (node.srcObject) {
      node.srcObject = null;
    }
  }, [hasLiveVideo, tile.stream]);

  return (
    <article
      className={`group relative overflow-hidden rounded-3xl border bg-slate-900 transition-all duration-500 ${
        spotlight
          ? 'border-amber-300 shadow-xl shadow-amber-200/30 ring-2 ring-amber-300/60 dark:border-amber-500/60 dark:shadow-amber-900/20'
          : 'border-slate-700/80 shadow-soft'
      } ${large ? 'aspect-video min-h-[220px] sm:min-h-[320px]' : 'aspect-video min-h-[120px]'}`}
    >
      {hasLiveVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={tile.isLocal}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-800 to-adapt-navy px-4 text-center dark:from-gray-900 dark:to-indigo-950">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white">
            <User className="h-8 w-8" aria-hidden />
          </span>
          <p className="text-sm font-black text-white">{tile.name}</p>
          <p className="text-xs font-semibold text-white/70">
            {tile.videoEnabled ? 'Camera starting…' : 'Camera off'}
          </p>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/75 to-transparent px-3 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white">{tile.name}</p>
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">
            {tile.role === 'teacher' ? 'Teacher' : 'Learner'}
            {tile.handRaised ? ' · Hand raised' : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {spotlight && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/90 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-950">
              <Star className="h-3 w-3" aria-hidden />
              Spotlight
            </span>
          )}
          {tile.screenSharing && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/90 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white">
              <MonitorUp className="h-3 w-3" aria-hidden />
              Presenting
            </span>
          )}
          {!tile.audioEnabled && (
            <span className="rounded-full bg-red-500/90 p-1.5 text-white" title="Mic off">
              <MicOff className="h-3.5 w-3.5" aria-hidden />
            </span>
          )}
          {!tile.videoEnabled && (
            <span className="rounded-full bg-slate-700/90 p-1.5 text-white" title="Camera off">
              <VideoOff className="h-3.5 w-3.5" aria-hidden />
            </span>
          )}
        </div>
      </div>

      {showSpotlightAction && onSpotlight && !spotlight && (
        <button
          type="button"
          onClick={onSpotlight}
          className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-3 py-1.5 text-xs font-black text-white opacity-0 transition hover:bg-black/75 group-hover:opacity-100"
        >
          <Star className="h-3.5 w-3.5" aria-hidden />
          Spotlight
        </button>
      )}
    </article>
  );
};

const ClassroomVideoStage: React.FC<ClassroomVideoStageProps> = ({
  tiles,
  spotlightId,
  teacherId,
  role,
  onSpotlight,
}) => {
  const spotlightTargetId = spotlightId === TEACHER_SPOTLIGHT_ID ? teacherId : spotlightId;

  const { spotlightTile, filmstripTiles } = useMemo(() => {
    const spotlightTileMatch =
      tiles.find((tile) => tile.id === spotlightTargetId) ?? tiles[0] ?? null;
    const filmstrip = tiles.filter((tile) => tile.id !== spotlightTileMatch?.id);
    return { spotlightTile: spotlightTileMatch, filmstripTiles: filmstrip };
  }, [spotlightTargetId, tiles]);

  if (!spotlightTile) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-gray-700 dark:bg-gray-950">
        <Video className="mx-auto h-10 w-10 text-slate-400" aria-hidden />
        <p className="mt-3 text-sm font-bold text-slate-500 dark:text-gray-400">
          Turn on your camera to join the video stage.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <VideoTile
        tile={spotlightTile}
        large
        spotlight
        showSpotlightAction={false}
      />

      {filmstripTiles.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filmstripTiles.map((tile) => (
            <VideoTile
              key={tile.id}
              tile={tile}
              spotlight={tile.id === spotlightTargetId}
              showSpotlightAction={role === 'teacher'}
              onSpotlight={() =>
                onSpotlight?.(tile.role === 'teacher' ? TEACHER_SPOTLIGHT_ID : tile.id)
              }
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default ClassroomVideoStage;
