import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AutismProfile,
  NowNextLaterState,
  ScheduleItem,
  SocialStory,
} from 'features/child/types/autismProfile';

const defaultProfile = (childId = 'guest-child'): AutismProfile => ({
  childId,
  communication: {
    style: [],
    supportFormat: ['all'],
    quickButtons: [
      { id: 'help', label: 'I need help', icon: 'Help', enabled: true },
      { id: 'break', label: 'I need a break', icon: 'Break', enabled: true },
      { id: 'loud', label: 'Too loud', icon: 'Loud', enabled: true },
      { id: 'confused', label: "I'm confused", icon: 'Confused', enabled: true },
      { id: 'finished', label: "I'm finished", icon: 'Done', enabled: true },
    ],
    customPhrases: [],
  },
  sensory: {
    sensitivities: [],
    calmingTools: ['quiet', 'breathing', 'trustedAdult'],
    reducedAnimations: false,
    customNotes: '',
  },
  routine: {
    preference: 'flexible',
    warningTime: 5,
    difficultTransitions: [],
  },
  learning: {
    bestFormats: ['pictures', 'checklist'],
    interests: [],
    oneInstructionAtATime: true,
  },
  safety: {
    helpAlertContacts: [],
    overwhelmSigns: '',
    preferredSupport: '',
  },
  completedAt: null,
  updatedAt: new Date().toISOString(),
});

const defaultSchedule: ScheduleItem[] = [
  { id: 'hello', label: 'Hello check-in', icon: 'Hi', done: false },
  { id: 'calm', label: 'Choose calm tool', icon: 'Calm', done: false },
  { id: 'learn', label: 'Learning mission', icon: 'Learn', done: false },
  { id: 'reward', label: 'Reward choice', icon: 'Star', done: false },
];

interface AutismProfileState {
  profile: AutismProfile;
  schedule: ScheduleItem[];
  nowNextLater: NowNextLaterState;
  socialStories: SocialStory[];
  updateProfile: (profile: AutismProfile) => void;
  updateSchedule: (items: ScheduleItem[]) => void;
  toggleScheduleDone: (id: string) => void;
  updateNowNextLater: (state: NowNextLaterState) => void;
  addSocialStory: (story: Omit<SocialStory, 'id'>) => void;
}

export const useAutismProfileStore = create<AutismProfileState>()(
  persist(
    (set) => ({
      profile: defaultProfile(),
      schedule: defaultSchedule,
      nowNextLater: {
        now: 'Choose a calm start',
        next: 'Do one small task',
        later: 'Take a reward break',
      },
      socialStories: [
        {
          id: 'plan-change',
          title: 'When the plan changes',
          panels: [
            'Sometimes the plan changes.',
            'I can look for the next clear step.',
            'I can ask my trusted adult for help.',
          ],
        },
      ],

      updateProfile: (profile) =>
        set({
          profile: {
            ...profile,
            updatedAt: new Date().toISOString(),
          },
        }),

      updateSchedule: (schedule) => set({ schedule }),

      toggleScheduleDone: (id) =>
        set((state) => ({
          schedule: state.schedule.map((item) =>
            item.id === id ? { ...item, done: !item.done } : item,
          ),
        })),

      updateNowNextLater: (nowNextLater) => set({ nowNextLater }),

      addSocialStory: (story) =>
        set((state) => ({
          socialStories: [
            ...state.socialStories,
            { ...story, id: `story-${Date.now()}` },
          ],
        })),
    }),
    { name: 'adaptbuddy-autism-profile' },
  ),
);
