import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { getReadyChildProgressForOwner } from 'features/child/store/childProgressReadAccess';
import { copyFlowDraft, isFlowDraft, type FlowDraft } from './touretteSupportContent';

export interface FlowDraftLease { readonly ownerId: string; readonly generation: number }
const readyOwner = (id: string) => Boolean(getReadyChildProgressForOwner(id)
  && useAuthStore.getState().profile?.neuro_types?.includes('tourettes'));

/** One bounded draft in this JS tab only. No localStorage, sessionStorage, database or network. */
export const createTicFlowDraftCache = () => {
  let ownerId: string | null = null;
  let generation = 0;
  let draft: FlowDraft | null = null;
  let unsubscribers: Array<() => void> = [];
  const dispose = () => {
    const previous = unsubscribers;
    unsubscribers = [];
    ownerId = null; draft = null; generation += 1;
    previous.forEach(unsubscribe => unsubscribe());
  };
  const checkScope = () => { if (ownerId && !readyOwner(ownerId)) dispose(); };
  const valid = (lease: FlowDraftLease | null): lease is FlowDraftLease => {
    checkScope();
    return Boolean(lease && lease.ownerId === ownerId && lease.generation === generation && readyOwner(lease.ownerId));
  };
  return {
    acquire(id: string): FlowDraftLease | null {
      checkScope();
      if (!readyOwner(id)) return null;
      if (ownerId !== id) {
        dispose(); ownerId = id;
        // Keep these narrow listeners while a draft may survive modal unmount.
        // Any brief auth/hydration/profile interruption destroys both draft and lease.
        unsubscribers = [useAuthStore.subscribe(checkScope), useChildProgressStore.subscribe(checkScope)];
      }
      return { ownerId: id, generation };
    },
    read(lease: FlowDraftLease | null): FlowDraft | null {
      return valid(lease) && draft ? copyFlowDraft(draft) : null;
    },
    write(lease: FlowDraftLease | null, value: unknown): boolean {
      if (!valid(lease) || !isFlowDraft(value)) return false;
      draft = value.cards.length ? copyFlowDraft(value) : null;
      return true;
    },
    clear(lease: FlowDraftLease | null): boolean {
      if (!valid(lease)) return false;
      draft = null; return true;
    },
    dispose,
  };
};

export const ticFlowDraftCache = createTicFlowDraftCache();
