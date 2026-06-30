import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TrustedAdult {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  contact?: string;
  status: 'active' | 'connected' | 'pending';
}

interface TrustedAdultState {
  trustedAdults: TrustedAdult[];
  selectedTrustedAdultId: string | null;
  addTrustedAdult: (adult: Omit<TrustedAdult, 'id' | 'status'> & Partial<Pick<TrustedAdult, 'id' | 'status'>>) => TrustedAdult;
  setTrustedAdults: (adults: TrustedAdult[]) => void;
  selectTrustedAdult: (adultId: string) => void;
}

const defaultTrustedAdults: TrustedAdult[] = [
  {
    id: 'trusted-parent',
    name: 'Parent or guardian',
    role: 'Primary trusted adult',
    status: 'connected',
  },
  {
    id: 'trusted-teacher',
    name: 'Class teacher',
    role: 'School support',
    status: 'connected',
  },
];

export const useTrustedAdultStore = create<TrustedAdultState>()(
  persist(
    (set, get) => ({
      trustedAdults: defaultTrustedAdults,
      selectedTrustedAdultId: defaultTrustedAdults[0]?.id ?? null,

      addTrustedAdult: (adult) => {
        const created: TrustedAdult = {
          ...adult,
          id: adult.id ?? `trusted-${Date.now()}`,
          status: adult.status ?? 'pending',
        };

        set((state) => ({
          trustedAdults: [
            ...state.trustedAdults.filter((existing) => existing.id !== created.id),
            created,
          ],
          selectedTrustedAdultId: created.id,
        }));

        return created;
      },

      setTrustedAdults: (adults) => {
        const nextAdults = adults.length > 0 ? adults : defaultTrustedAdults;
        const currentSelected = get().selectedTrustedAdultId;
        const selectedTrustedAdultId = nextAdults.some((adult) => adult.id === currentSelected)
          ? currentSelected
          : nextAdults[0]?.id ?? null;

        set({ trustedAdults: nextAdults, selectedTrustedAdultId });
      },

      selectTrustedAdult: (adultId) => {
        if (!get().trustedAdults.some((adult) => adult.id === adultId)) return;
        set({ selectedTrustedAdultId: adultId });
      },
    }),
    { name: 'adaptbuddy-trusted-adults' },
  ),
);
