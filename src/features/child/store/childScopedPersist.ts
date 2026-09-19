import { createJSONStorage, type StateStorage } from 'zustand/middleware';

export type ChildScopeToken = Readonly<{
  childId: string;
  generation: number;
}>;

export type ChildHydrationResult = 'ready' | 'stale' | 'error';

/**
 * Creates a storage gate for child-owned Zustand state.
 *
 * Writes stay disabled while a store resets and rehydrates. This prevents a
 * reset for Child B from overwriting Child B's saved state, and it prevents a
 * late Child A hydration from becoming writable after the account changes.
 */
export const createChildScopedPersistScope = <PersistedState>(baseKey: string) => {
  let boundChildId: string | null = null;
  let writable = false;
  let generation = 0;

  const normalizeChildId = (childId: string) => {
    const normalizedChildId = childId.trim();
    if (!normalizedChildId) throw new Error('A child account id is required.');
    return normalizedChildId;
  };

  const storageKey = (childId: string) =>
    `${baseKey}:v2:${encodeURIComponent(normalizeChildId(childId))}`;
  const activeStorageKey = () => boundChildId ? storageKey(boundChildId) : null;

  const stateStorage: StateStorage = {
    getItem: () => {
      const key = activeStorageKey();
      if (!key || typeof window === 'undefined') return null;
      return window.localStorage.getItem(key);
    },
    setItem: (_name, value) => {
      const key = activeStorageKey();
      if (!key || !writable || typeof window === 'undefined') return;
      window.localStorage.setItem(key, value);
    },
    removeItem: () => {
      const key = activeStorageKey();
      if (!key || !writable || typeof window === 'undefined') return;
      window.localStorage.removeItem(key);
    },
  };

  return {
    storage: createJSONStorage<PersistedState>(() => stateStorage),
    begin: (childId: string): ChildScopeToken => {
      const normalizedChildId = normalizeChildId(childId);
      generation += 1;
      boundChildId = normalizedChildId;
      writable = false;
      return { childId: normalizedChildId, generation };
    },
    enable: (token: ChildScopeToken) => {
      if (boundChildId !== token.childId || generation !== token.generation) return false;
      writable = true;
      return true;
    },
    isCurrent: (token: ChildScopeToken) =>
      boundChildId === token.childId && generation === token.generation,
    unbind: () => {
      generation += 1;
      boundChildId = null;
      writable = false;
    },
    currentChildId: () => boundChildId,
    storageKey,
  };
};
