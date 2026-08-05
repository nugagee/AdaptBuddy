const LIVE_VIDEO_TRACK = (track: MediaStreamTrack) => track.kind === 'video' && track.readyState === 'live';
const LIVE_AUDIO_TRACK = (track: MediaStreamTrack) => track.kind === 'audio' && track.readyState === 'live';

export function getLiveVideoTrack(stream: MediaStream | null | undefined): MediaStreamTrack | undefined {
  return stream?.getVideoTracks().find(LIVE_VIDEO_TRACK);
}

export function getLiveAudioTrack(stream: MediaStream | null | undefined): MediaStreamTrack | undefined {
  return stream?.getAudioTracks().find(LIVE_AUDIO_TRACK);
}

export function pruneEndedTracks(stream: MediaStream) {
  [...stream.getVideoTracks(), ...stream.getAudioTracks()]
    .filter((track) => track.readyState === 'ended')
    .forEach((track) => {
      try {
        stream.removeTrack(track);
      } catch {
        // removeTrack unsupported on some browsers — ignore ended tracks
      }
    });
}

export async function acquireLocalMedia(video: boolean, audio: boolean): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera and microphone are not supported in this browser.');
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      video: video ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
    });
  } catch (primaryError) {
    if (!video) throw primaryError;

    // Some devices fail with ideal resolution — retry with default constraints.
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
      });
    } catch {
      throw primaryError;
    }
  }
}

export function stopMediaStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function formatMediaError(error: unknown, device: 'camera' | 'microphone'): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return device === 'camera'
        ? 'Camera permission was blocked. Check your browser settings and try again.'
        : 'Microphone permission was blocked. Check your browser settings and try again.';
    }
    if (error.name === 'NotFoundError') {
      return device === 'camera'
        ? 'No camera was found on this device.'
        : 'No microphone was found on this device.';
    }
    if (error.name === 'NotReadableError') {
      return device === 'camera'
        ? 'Your camera may be in use by another app. Close other apps, then try again.'
        : 'Your microphone may be in use by another app. Close other apps, then try again.';
    }
    if (error.name === 'OverconstrainedError') {
      return `Could not use your ${device} with the requested settings.`;
    }
    if (error.message) return error.message;
  }

  if (error instanceof Error && error.message) return error.message;
  return device === 'camera'
    ? 'Could not access your camera.'
    : 'Could not access your microphone.';
}

export async function ensureMediaStream(
  current: MediaStream | null,
  wantVideo: boolean,
  wantAudio: boolean,
): Promise<MediaStream> {
  let stream = current;

  if (stream) {
    pruneEndedTracks(stream);
  }

  const hasLiveVideo = Boolean(getLiveVideoTrack(stream));
  const hasLiveAudio = Boolean(getLiveAudioTrack(stream));
  const needsVideo = wantVideo && !hasLiveVideo;
  const needsAudio = wantAudio && !hasLiveAudio;

  if (!stream || needsVideo || needsAudio) {
    stopMediaStream(stream);
    return acquireLocalMedia(wantVideo || hasLiveVideo, wantAudio || hasLiveAudio);
  }

  const videoTrack = getLiveVideoTrack(stream);
  const audioTrack = getLiveAudioTrack(stream);
  if (videoTrack) videoTrack.enabled = wantVideo;
  if (audioTrack) audioTrack.enabled = wantAudio;
  return stream;
}

export function setStreamVideoEnabled(stream: MediaStream | null, enabled: boolean) {
  const track = getLiveVideoTrack(stream);
  if (track) {
    track.enabled = enabled;
    if (!enabled) {
      track.stop();
      try {
        stream?.removeTrack(track);
      } catch {
        // ignore
      }
    }
  }
}

export function setStreamAudioEnabled(stream: MediaStream | null, enabled: boolean) {
  const track = getLiveAudioTrack(stream);
  if (track) {
    track.enabled = enabled;
    if (!enabled) {
      track.stop();
      try {
        stream?.removeTrack(track);
      } catch {
        // ignore
      }
    }
  }
}

export async function acquireDisplayMedia(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Screen sharing is not supported in this browser.');
  }

  return navigator.mediaDevices.getDisplayMedia({
    video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
    audio: false,
  });
}

export function formatScreenShareError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return 'Screen sharing was cancelled or blocked.';
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Could not share your screen.';
}
