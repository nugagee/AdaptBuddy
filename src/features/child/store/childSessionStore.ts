import { create } from 'zustand';
import {
  clearChildSessionTime,
  readLastVisitSeconds,
  readSessionSeconds,
  saveLastVisitSeconds,
  writeSessionSeconds,
} from 'features/child/utils/childSessionTime';

interface ChildSessionState {
  userId: string | null;
  elapsedSeconds: number;
  lastVisitSeconds: number;
  initSession: (userId: string) => void;
  tick: () => void;
  flushVisitForUser: (userId: string, seconds: number) => void;
  resetSession: () => void;
}

export const useChildSessionStore = create<ChildSessionState>((set, get) => ({
  userId: null,
  elapsedSeconds: 0,
  lastVisitSeconds: 0,

  initSession: (userId) => {
    set({
      userId,
      elapsedSeconds: readSessionSeconds(userId),
      lastVisitSeconds: readLastVisitSeconds(userId),
    });
  },

  tick: () => {
    const { userId, elapsedSeconds } = get();
    if (!userId || typeof document === 'undefined') return;
    if (document.visibilityState === 'hidden') return;

    const next = elapsedSeconds + 1;
    writeSessionSeconds(userId, next);
    set({ elapsedSeconds: next });
  },

  flushVisitForUser: (userId, seconds) => {
    if (seconds > 0) saveLastVisitSeconds(userId, seconds);
  },

  resetSession: () => {
    const { userId, elapsedSeconds } = get();
    if (userId) {
      saveLastVisitSeconds(userId, elapsedSeconds);
      clearChildSessionTime(userId);
    }
    set({ userId: null, elapsedSeconds: 0, lastVisitSeconds: 0 });
  },
}));
