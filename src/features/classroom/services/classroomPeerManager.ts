import type { ClassroomSignalMessage, ClassroomSignalingAdapter } from 'features/classroom/services/classroomSignaling';

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

interface PeerEntry {
  connection: RTCPeerConnection;
  remoteStream: MediaStream;
}

export class ClassroomPeerManager {
  private peers = new Map<string, PeerEntry>();
  private localStream: MediaStream | null = null;
  private localUserId = '';
  private disposed = false;
  private makingOffer = new Set<string>();

  constructor(
    private signaling: ClassroomSignalingAdapter,
    private onRemoteStream: (peerId: string, stream: MediaStream | null) => void,
  ) {
    this.signaling.subscribe(this.handleSignal);
  }

  setLocalUserId(userId: string) {
    this.localUserId = userId;
  }

  async setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    await this.updateOutboundTracks(
      stream?.getVideoTracks().find((track) => track.readyState === 'live') ?? null,
      stream?.getAudioTracks().find((track) => track.readyState === 'live') ?? null,
    );
  }

  async setPresentationStream(presentationStream: MediaStream | null) {
    const cameraVideo =
      this.localStream?.getVideoTracks().find((track) => track.readyState === 'live') ?? null;
    const presentationVideo =
      presentationStream?.getVideoTracks().find((track) => track.readyState === 'live') ?? null;
    const audio =
      this.localStream?.getAudioTracks().find((track) => track.readyState === 'live') ?? null;
    await this.updateOutboundTracks(presentationVideo ?? cameraVideo, audio);

    if (presentationStream) {
      this.signaling.send({ type: 'ready', from: this.localUserId, to: '*' });
    }
  }

  private async updateOutboundTracks(
    videoTrack: MediaStreamTrack | null,
    audioTrack: MediaStreamTrack | null,
  ) {
    const peerEntries = Array.from(this.peers.entries());
    for (const [peerId, entry] of peerEntries) {
      const senders = entry.connection.getSenders();
      const videoSender = senders.find((sender) => sender.track?.kind === 'video');
      const audioSender = senders.find((sender) => sender.track?.kind === 'audio');

      if (videoSender) {
        await videoSender.replaceTrack(videoTrack);
      } else if (videoTrack && this.localStream) {
        entry.connection.addTrack(videoTrack, this.localStream);
      }

      if (audioSender) {
        await audioSender.replaceTrack(audioTrack);
      } else if (audioTrack && this.localStream) {
        entry.connection.addTrack(audioTrack, this.localStream);
      }

      if ((videoTrack || audioTrack) && !this.makingOffer.has(peerId)) {
        await this.createOffer(peerId, entry.connection);
      }
    }

    if (videoTrack || audioTrack) {
      this.signaling.send({ type: 'ready', from: this.localUserId, to: '*' });
    }
  }

  announcePresence() {
    if (!this.localUserId) return;
    this.signaling.send({ type: 'ready', from: this.localUserId, to: '*' });
  }

  private handleSignal = async (message: ClassroomSignalMessage) => {
    if (this.disposed || !this.localUserId) return;
    if (message.from === this.localUserId) return;
    if (message.to !== '*' && message.to !== this.localUserId) return;

    if (message.type === 'ready') {
      if (this.localStream) {
        await this.ensurePeer(message.from, true);
      }
      return;
    }

    if (message.type === 'leave') {
      this.removePeer(message.from);
      return;
    }

    const entry = await this.ensurePeer(message.from, false);
    if (!entry) return;

    if (message.type === 'offer' && message.payload) {
      if (entry.connection.signalingState !== 'stable') return;
      const offer = message.payload as RTCSessionDescriptionInit;
      await entry.connection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await entry.connection.createAnswer();
      await entry.connection.setLocalDescription(answer);
      this.signaling.send({
        type: 'answer',
        from: this.localUserId,
        to: message.from,
        payload: answer,
      });
      return;
    }

    if (message.type === 'answer' && message.payload) {
      if (entry.connection.signalingState === 'stable') return;
      const answer = message.payload as RTCSessionDescriptionInit;
      await entry.connection.setRemoteDescription(new RTCSessionDescription(answer));
      return;
    }

    if (message.type === 'ice-candidate' && message.payload) {
      try {
        const candidate = message.payload as RTCIceCandidateInit;
        await entry.connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // ICE can arrive before remote description in edge cases
      }
    }
  };

  private async ensurePeer(peerId: string, createOffer: boolean): Promise<PeerEntry | null> {
    if (this.peers.has(peerId)) {
      const existing = this.peers.get(peerId)!;
      if (createOffer && this.localStream) {
        await this.createOffer(peerId, existing.connection);
      }
      return existing;
    }

    const remoteStream = new MediaStream();
    const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    connection.onicecandidate = (event) => {
      if (!event.candidate) return;
      this.signaling.send({
        type: 'ice-candidate',
        from: this.localUserId,
        to: peerId,
        payload: event.candidate.toJSON(),
      });
    };

    connection.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        if (!remoteStream.getTracks().some((existing) => existing.id === track.id)) {
          remoteStream.addTrack(track);
        }
      });
      this.onRemoteStream(peerId, remoteStream);
    };

    connection.onconnectionstatechange = () => {
      if (connection.connectionState === 'failed' || connection.connectionState === 'closed') {
        this.removePeer(peerId);
      }
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        connection.addTrack(track, this.localStream!);
      });
    }

    const entry: PeerEntry = { connection, remoteStream };
    this.peers.set(peerId, entry);

    if (createOffer && this.localStream) {
      await this.createOffer(peerId, connection);
    }

    return entry;
  }

  private async createOffer(peerId: string, connection: RTCPeerConnection) {
    if (this.makingOffer.has(peerId)) return;
    if (connection.signalingState !== 'stable') return;

    this.makingOffer.add(peerId);
    try {
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      this.signaling.send({
        type: 'offer',
        from: this.localUserId,
        to: peerId,
        payload: offer,
      });
    } catch (error) {
      console.warn(`WebRTC offer failed for peer ${peerId}:`, error);
    } finally {
      this.makingOffer.delete(peerId);
    }
  }

  private removePeer(peerId: string) {
    const entry = this.peers.get(peerId);
    if (!entry) return;
    entry.connection.close();
    this.peers.delete(peerId);
    this.onRemoteStream(peerId, null);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.localUserId) {
      this.signaling.send({ type: 'leave', from: this.localUserId, to: '*' });
    }
    this.peers.forEach((_, peerId) => this.removePeer(peerId));
    this.signaling.dispose();
  }
}
