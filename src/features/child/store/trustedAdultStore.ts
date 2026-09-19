import { create } from 'zustand';

export interface TrustedAdult {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  contact?: string;
  status: 'active' | 'connected' | 'pending' | 'declined' | 'revoked' | 'expired';
}

interface TrustedAdultState {
  ownerChildId: string | null;
  trustedAdults: TrustedAdult[];
  selectedTrustedAdultId: string | null;
  setTrustedAdults: (childId: string, adults: TrustedAdult[]) => void;
  selectTrustedAdult: (adultId: string) => void;
  clearTrustedAdults: () => void;
}

export const isConnectedTrustedAdult = (adult: TrustedAdult): boolean =>
  adult.status === 'active' || adult.status === 'connected';

const selectedIdFor = (adults: TrustedAdult[], selected: unknown): string | null => {
  const connectedAdults = adults.filter(isConnectedTrustedAdult);
  return typeof selected === 'string' && connectedAdults.some((adult) => adult.id === selected)
    ? selected
    : connectedAdults[0]?.id ?? null;
};

// Older releases persisted adult contact details and fictional connected adults
// in one browser-wide key. The server is now the only authority for this list.
if (typeof window !== 'undefined') {
  try {
    window.localStorage.removeItem('adaptbuddy-trusted-adults');
  } catch {
    // Storage may be unavailable in private/restricted browser contexts.
  }
}

export const useTrustedAdultStore = create<TrustedAdultState>((set, get) => ({
  ownerChildId: null,
  trustedAdults: [],
  selectedTrustedAdultId: null,

  setTrustedAdults: (childId, adults) => {
    const previousSelection = get().ownerChildId === childId
      ? get().selectedTrustedAdultId
      : null;
    set({
      ownerChildId: childId,
      trustedAdults: adults,
      selectedTrustedAdultId: selectedIdFor(
        adults,
        previousSelection,
      ),
    });
  },

  selectTrustedAdult: (adultId) => {
    const adult = get().trustedAdults.find((candidate) => candidate.id === adultId);
    if (!adult || !isConnectedTrustedAdult(adult)) return;
    set({ selectedTrustedAdultId: adultId });
  },

  clearTrustedAdults: () => {
    set({
      ownerChildId: null,
      trustedAdults: [],
      selectedTrustedAdultId: null,
    });
  },
}));
