export type ClassroomSignalType = 'ready' | 'offer' | 'answer' | 'ice-candidate' | 'leave';

export interface ClassroomSignalMessage {
  type: ClassroomSignalType;
  from: string;
  to: string;
  payload?: RTCSessionDescriptionInit | RTCIceCandidateInit | null;
  sentAt: number;
}

export interface ClassroomSignalingAdapter {
  subscribe: (handler: (message: ClassroomSignalMessage) => void) => () => void;
  send: (message: Omit<ClassroomSignalMessage, 'sentAt'>) => void;
  dispose: () => void;
}

const STORAGE_PREFIX = 'adaptbuddy-classroom-signal-';

export function createBroadcastSignalingAdapter(sessionId: string): ClassroomSignalingAdapter {
  const channelName = `${STORAGE_PREFIX}${sessionId}`;
  const channel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(channelName) : null;
  const handlers = new Set<(message: ClassroomSignalMessage) => void>();

  const dispatch = (message: ClassroomSignalMessage) => {
    handlers.forEach((handler) => handler(message));
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== channelName || !event.newValue) return;
    try {
      dispatch(JSON.parse(event.newValue) as ClassroomSignalMessage);
    } catch {
      // ignore malformed payloads
    }
  };

  if (channel) {
    channel.onmessage = (event) => dispatch(event.data as ClassroomSignalMessage);
  } else {
    window.addEventListener('storage', onStorage);
  }

  return {
    subscribe: (handler) => {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    send: (message) => {
      const payload: ClassroomSignalMessage = { ...message, sentAt: Date.now() };
      if (channel) {
        channel.postMessage(payload);
      } else {
        localStorage.setItem(channelName, JSON.stringify(payload));
        dispatch(payload);
      }
    },
    dispose: () => {
      handlers.clear();
      if (channel) {
        channel.close();
      } else {
        window.removeEventListener('storage', onStorage);
      }
    },
  };
}

export async function createSupabaseSignalingAdapter(sessionId: string): Promise<ClassroomSignalingAdapter> {
  const { getSupabaseClient } = await import('services/supabase/client');
  const client = getSupabaseClient();
  const channel = client.channel(`classroom-media:${sessionId}`, {
    config: { broadcast: { self: false } },
  });
  const handlers = new Set<(message: ClassroomSignalMessage) => void>();

  channel
    .on('broadcast', { event: 'webrtc-signal' }, ({ payload }) => {
      if (!payload || typeof payload !== 'object') return;
      handlers.forEach((handler) => handler(payload as ClassroomSignalMessage));
    })
    .subscribe();

  return {
    subscribe: (handler) => {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    send: (message) => {
      void channel.send({
        type: 'broadcast',
        event: 'webrtc-signal',
        payload: { ...message, sentAt: Date.now() },
      });
    },
    dispose: () => {
      handlers.clear();
      void client.removeChannel(channel);
    },
  };
}

export async function createClassroomSignalingAdapter(sessionId: string): Promise<ClassroomSignalingAdapter> {
  const { isSupabaseConfigured } = await import('services/supabase/client');
  if (isSupabaseConfigured) {
    return createSupabaseSignalingAdapter(sessionId);
  }
  return createBroadcastSignalingAdapter(sessionId);
}
