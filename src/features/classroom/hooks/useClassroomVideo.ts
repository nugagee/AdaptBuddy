import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClassroomPeerManager } from 'features/classroom/services/classroomPeerManager';
import {
  acquireDisplayMedia,
  ensureMediaStream,
  formatMediaError,
  formatScreenShareError,
  getLiveAudioTrack,
  getLiveVideoTrack,
  setStreamAudioEnabled,
  setStreamVideoEnabled,
  stopMediaStream,
} from 'features/classroom/services/classroomMedia';
import { createClassroomSignalingAdapter } from 'features/classroom/services/classroomSignaling';
import type {
  ClassSessionSnapshot,
  ClassroomRole,
  ClassroomVideoTile,
  SpotlightParticipantId,
} from 'features/classroom/types/classLiveSession.types';
import { TEACHER_SPOTLIGHT_ID } from 'features/classroom/types/classLiveSession.types';

interface UseClassroomVideoOptions {
  sessionId: string | null | undefined;
  localUserId: string;
  localUserName: string;
  role: ClassroomRole;
  snapshot: ClassSessionSnapshot | null;
  enabled?: boolean;
  onMediaSync?: (patch: { videoEnabled?: boolean; audioEnabled?: boolean }) => Promise<void>;
  onScreenShareChange?: (active: boolean) => Promise<void>;
  learnerScreenShareStatus?: 'none' | 'pending' | 'approved' | 'active';
  canStartScreenShare?: boolean;
}

export function useClassroomVideo({
  sessionId,
  localUserId,
  localUserName,
  role,
  snapshot,
  enabled = true,
  onMediaSync,
  onScreenShareChange,
  learnerScreenShareStatus = 'none',
  canStartScreenShare = true,
}: UseClassroomVideoOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const peerManagerRef = useRef<ClassroomPeerManager | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const localUserIdRef = useRef(localUserId);
  const peerReadyRef = useRef<Promise<void> | null>(null);

  const settings = snapshot?.session;
  const restrictVideo = role === 'learner' && Boolean(settings?.restrictLearnerVideo);
  const restrictMic = role === 'learner' && Boolean(settings?.restrictLearnerMic);
  const canToggleVideo = role === 'teacher' || !restrictVideo;
  const canToggleMic = role === 'teacher' || !restrictMic;
  const spotlightId: SpotlightParticipantId =
    settings?.spotlightParticipantId ?? TEACHER_SPOTLIGHT_ID;

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    screenStreamRef.current = screenStream;
  }, [screenStream]);

  useEffect(() => {
    localUserIdRef.current = localUserId;
    peerManagerRef.current?.setLocalUserId(localUserId);
  }, [localUserId]);

  useEffect(() => {
    if (!sessionId || !enabled) {
      peerReadyRef.current = null;
      return undefined;
    }

    let active = true;
    let signalingDispose: (() => void) | null = null;

    peerReadyRef.current = createClassroomSignalingAdapter(sessionId).then((signaling) => {
      if (!active) {
        signaling.dispose();
        return;
      }

      signalingDispose = () => signaling.dispose();
      const manager = new ClassroomPeerManager(signaling, (peerId, stream) => {
        setRemoteStreams((current) => {
          const next = { ...current };
          if (!stream || stream.getTracks().length === 0) {
            delete next[peerId];
          } else {
            next[peerId] = stream;
          }
          return next;
        });
      });

      manager.setLocalUserId(localUserIdRef.current);
      manager.announcePresence();
      peerManagerRef.current = manager;

      if (localStreamRef.current) {
        void manager.setLocalStream(localStreamRef.current).catch((error) => {
          console.warn('Could not attach existing stream to classroom peers:', error);
        });
      }
    });

    return () => {
      active = false;
      peerManagerRef.current?.dispose();
      peerManagerRef.current = null;
      peerReadyRef.current = null;
      signalingDispose?.();
    };
  }, [sessionId, enabled]);

  useEffect(
    () => () => {
      stopMediaStream(localStreamRef.current);
      stopMediaStream(screenStreamRef.current);
      localStreamRef.current = null;
      screenStreamRef.current = null;
    },
    [],
  );

  const syncMediaSafe = useCallback(async (patch: { videoEnabled?: boolean; audioEnabled?: boolean }) => {
    if (!onMediaSync) return;
    try {
      await onMediaSync(patch);
    } catch (error) {
      console.warn('Could not sync classroom media state:', error);
    }
  }, [onMediaSync]);

  useEffect(() => {
    if (!restrictVideo || !videoEnabled) return;
    setStreamVideoEnabled(localStreamRef.current, false);
    setVideoEnabled(false);
    void syncMediaSafe({ videoEnabled: false });
  }, [restrictVideo, syncMediaSafe, videoEnabled]);

  useEffect(() => {
    if (!restrictMic || !audioEnabled) return;
    setStreamAudioEnabled(localStreamRef.current, false);
    setAudioEnabled(false);
    void syncMediaSafe({ audioEnabled: false });
  }, [restrictMic, syncMediaSafe, audioEnabled]);

  const waitForPeerManager = useCallback(async () => {
    if (peerReadyRef.current) {
      await peerReadyRef.current;
    }
  }, []);

  const applyStream = useCallback(
    async (stream: MediaStream | null) => {
      localStreamRef.current = stream;
      setLocalStream(stream);

      try {
        await waitForPeerManager();
        await peerManagerRef.current?.setLocalStream(stream);
      } catch (error) {
        console.warn('WebRTC update failed — local preview still works:', error);
      }
    },
    [waitForPeerManager],
  );

  const toggleVideo = useCallback(async () => {
    if (!canToggleVideo || busy) return;
    setBusy(true);
    setMediaError(null);

    try {
      if (videoEnabled) {
        setStreamVideoEnabled(localStreamRef.current, false);
        const remaining = localStreamRef.current;
        if (!getLiveVideoTrack(remaining) && !getLiveAudioTrack(remaining)) {
          stopMediaStream(remaining);
          await applyStream(null);
        } else {
          await applyStream(remaining);
        }
        setVideoEnabled(false);
        await syncMediaSafe({ videoEnabled: false });
        return;
      }

      const stream = await ensureMediaStream(localStreamRef.current, true, audioEnabled);
      await applyStream(stream);
      setVideoEnabled(true);
      await syncMediaSafe({ videoEnabled: true });
    } catch (error) {
      setMediaError(formatMediaError(error, 'camera'));
    } finally {
      setBusy(false);
    }
  }, [applyStream, audioEnabled, busy, canToggleVideo, syncMediaSafe, videoEnabled]);

  const toggleAudio = useCallback(async () => {
    if (!canToggleMic || busy) return;
    setBusy(true);
    setMediaError(null);

    try {
      if (audioEnabled) {
        setStreamAudioEnabled(localStreamRef.current, false);
        const remaining = localStreamRef.current;
        if (!getLiveVideoTrack(remaining) && !getLiveAudioTrack(remaining)) {
          stopMediaStream(remaining);
          await applyStream(null);
        } else {
          await applyStream(remaining);
        }
        setAudioEnabled(false);
        await syncMediaSafe({ audioEnabled: false });
        return;
      }

      const stream = await ensureMediaStream(localStreamRef.current, videoEnabled, true);
      await applyStream(stream);
      setAudioEnabled(true);
      await syncMediaSafe({ audioEnabled: true });
    } catch (error) {
      setMediaError(formatMediaError(error, 'microphone'));
    } finally {
      setBusy(false);
    }
  }, [applyStream, audioEnabled, busy, canToggleMic, syncMediaSafe, videoEnabled]);

  const stopScreenShare = useCallback(async () => {
    stopMediaStream(screenStreamRef.current);
    screenStreamRef.current = null;
    setScreenStream(null);
    setScreenSharing(false);
    try {
      await waitForPeerManager();
      await peerManagerRef.current?.setPresentationStream(null);
    } catch (error) {
      console.warn('Could not stop screen share track:', error);
    }
    if (onScreenShareChange) {
      try {
        await onScreenShareChange(false);
      } catch (error) {
        console.warn('Screen share sync failed:', error);
      }
    }
  }, [onScreenShareChange, waitForPeerManager]);

  const toggleScreenShare = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setMediaError(null);

    try {
      if (screenSharing) {
        await stopScreenShare();
        return;
      }

      if (!canStartScreenShare) {
        if (learnerScreenShareStatus === 'pending') {
          setMediaError('Your screen share request is waiting for teacher approval.');
        } else if (role === 'learner') {
          setMediaError('Ask your teacher to approve screen sharing first.');
        }
        return;
      }

      const displayStream = await acquireDisplayMedia();
      const track = displayStream.getVideoTracks()[0];
      track.onended = () => {
        void stopScreenShare();
      };

      screenStreamRef.current = displayStream;
      setScreenStream(displayStream);
      setScreenSharing(true);

      try {
        await waitForPeerManager();
        await peerManagerRef.current?.setPresentationStream(displayStream);
      } catch (error) {
        console.warn('WebRTC screen share failed — local preview still works:', error);
      }

      if (onScreenShareChange) {
        try {
          await onScreenShareChange(true);
        } catch (error) {
          console.warn('Screen share sync failed:', error);
        }
      }
    } catch (error) {
      setMediaError(formatScreenShareError(error));
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    canStartScreenShare,
    learnerScreenShareStatus,
    onScreenShareChange,
    role,
    screenSharing,
    stopScreenShare,
    waitForPeerManager,
  ]);

  const displayStreamForLocal = screenSharing ? screenStream : localStream;

  const tiles = useMemo((): ClassroomVideoTile[] => {
    if (!snapshot) return [];

    const teacherId = snapshot.session.teacherId;
    const teacherSharing = role === 'teacher' ? screenSharing : snapshot.session.teacherScreenSharing;
    const teacherTile: ClassroomVideoTile = {
      id: teacherId,
      name: role === 'teacher' ? `${localUserName} (You)` : 'Teacher',
      role: 'teacher',
      stream: role === 'teacher' ? displayStreamForLocal : remoteStreams[teacherId] ?? null,
      videoEnabled:
        role === 'teacher' ? videoEnabled || screenSharing : snapshot.session.teacherVideoEnabled || teacherSharing,
      audioEnabled:
        role === 'teacher' ? audioEnabled : snapshot.session.teacherAudioEnabled,
      screenSharing: teacherSharing,
      isLocal: role === 'teacher',
    };

    const learnerTiles = snapshot.participants
      .filter((participant) => participant.status === 'joined')
      .map((participant) => ({
        id: participant.childId,
        name:
          participant.childId === localUserId
            ? `${participant.childName} (You)`
            : participant.childName,
        role: 'learner' as const,
        stream:
          participant.childId === localUserId
            ? displayStreamForLocal
            : remoteStreams[participant.childId] ?? null,
        videoEnabled:
          participant.childId === localUserId
            ? videoEnabled || screenSharing
            : participant.videoEnabled || participant.screenSharing,
        audioEnabled:
          participant.childId === localUserId ? audioEnabled : participant.audioEnabled,
        screenSharing:
          participant.childId === localUserId ? screenSharing : participant.screenSharing,
        handRaised: participant.handRaised,
        isLocal: participant.childId === localUserId,
      }));

    return [teacherTile, ...learnerTiles];
  }, [
    audioEnabled,
    displayStreamForLocal,
    localUserId,
    localUserName,
    remoteStreams,
    role,
    screenSharing,
    snapshot,
    videoEnabled,
  ]);

  const resolveSpotlightTile = useCallback((): ClassroomVideoTile | null => {
    const targetId =
      spotlightId === TEACHER_SPOTLIGHT_ID ? snapshot?.session.teacherId : spotlightId;
    return tiles.find((tile) => tile.id === targetId) ?? tiles[0] ?? null;
  }, [snapshot?.session.teacherId, spotlightId, tiles]);

  return {
    tiles,
    spotlightTile: resolveSpotlightTile(),
    spotlightId,
    videoEnabled,
    audioEnabled,
    canToggleVideo,
    canToggleMic,
    restrictVideo,
    restrictMic,
    mediaError,
    busy,
    toggleVideo,
    toggleAudio,
    screenSharing,
    toggleScreenShare,
    learnerScreenShareStatus,
  };
}
