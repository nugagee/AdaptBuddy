import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  createChildScopedPersistScope,
  type ChildHydrationResult,
  type ChildScopeToken,
} from 'features/child/store/childScopedPersist';
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

const createInitialAutismProfileData = (childId = 'guest-child') => ({
  profile: defaultProfile(childId),
  schedule: defaultSchedule.map((item) => ({ ...item })),
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
});

export type ChildStoreHydrationStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AutismProfileState {
  ownerId: string | null;
  hydrationStatus: ChildStoreHydrationStatus;
  profile: AutismProfile;
  schedule: ScheduleItem[];
  nowNextLater: NowNextLaterState;
  socialStories: SocialStory[];
  updateProfile: (profile: AutismProfile) => void;
  updateSchedule: (items: ScheduleItem[]) => void;
  toggleScheduleDone: (id: string) => void;
  updateNowNextLater: (state: NowNextLaterState) => void;
  addSocialStory: (story: Omit<SocialStory, 'id'>) => void;
  resetForChild: (childId: string | null) => void;
  markReady: (childId: string) => void;
  markHydrationError: (childId: string) => void;
}

type PersistedAutismProfileState = Pick<
  AutismProfileState,
  'ownerId' | 'profile' | 'schedule' | 'nowNextLater' | 'socialStories'
>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isAutismProfileValue = (value: unknown): value is AutismProfile => {
  if (!isRecord(value)) return false;
  const communication = value.communication;
  const sensory = value.sensory;
  const routine = value.routine;
  const learning = value.learning;
  const safety = value.safety;
  const aboutMe = value.aboutMe;
  const emotional = value.emotional;
  const executiveFunction = value.executiveFunction;
  const goals = value.goals;

  return (
    typeof value.childId === 'string'
    && (value.completedAt === null || typeof value.completedAt === 'string')
    && typeof value.updatedAt === 'string'
    && isRecord(communication)
    && isStringArray(communication.style)
    && isStringArray(communication.supportFormat)
    && Array.isArray(communication.quickButtons)
    && communication.quickButtons.every((button) =>
      isRecord(button)
      && typeof button.id === 'string'
      && typeof button.label === 'string'
      && typeof button.icon === 'string'
      && typeof button.enabled === 'boolean')
    && isStringArray(communication.customPhrases)
    && (communication.difficulties === undefined || isStringArray(communication.difficulties))
    && isRecord(sensory)
    && isStringArray(sensory.sensitivities)
    && isStringArray(sensory.calmingTools)
    && typeof sensory.reducedAnimations === 'boolean'
    && typeof sensory.customNotes === 'string'
    && isRecord(routine)
    && typeof routine.preference === 'string'
    && typeof routine.warningTime === 'number'
    && Array.isArray(routine.difficultTransitions)
    && routine.difficultTransitions.every((item) =>
      isRecord(item)
      && typeof item.activity === 'string'
      && typeof item.notes === 'string')
    && isRecord(learning)
    && isStringArray(learning.bestFormats)
    && isStringArray(learning.interests)
    && typeof learning.oneInstructionAtATime === 'boolean'
    && isRecord(safety)
    && isStringArray(safety.helpAlertContacts)
    && typeof safety.overwhelmSigns === 'string'
    && typeof safety.preferredSupport === 'string'
    && (aboutMe === undefined || (
      isRecord(aboutMe)
      && typeof aboutMe.preferredName === 'string'
      && isStringArray(aboutMe.favouriteThings)
      && isStringArray(aboutMe.happyTriggers)
    ))
    && (emotional === undefined || (
      isRecord(emotional)
      && typeof emotional.worryTopics === 'string'
      && typeof emotional.frustrationTriggers === 'string'
      && isStringArray(emotional.calmStrategies)
      && typeof emotional.helpBehaviour === 'string'
    ))
    && (executiveFunction === undefined || (
      isRecord(executiveFunction)
      && typeof executiveFunction.startingTasks === 'boolean'
      && typeof executiveFunction.finishingTasks === 'boolean'
      && typeof executiveFunction.rememberingInstructions === 'boolean'
      && typeof executiveFunction.switchingActivities === 'boolean'
      && typeof executiveFunction.managingTime === 'boolean'
    ))
    && (goals === undefined || (isRecord(goals) && isStringArray(goals.selected)))
    && (
      value.companionOnboardingCompleted === undefined
      || typeof value.companionOnboardingCompleted === 'boolean'
    )
    && (value.onboardedWithParent === undefined || typeof value.onboardedWithParent === 'boolean')
  );
};

const isPersistedAutismProfileState = (
  value: unknown,
): value is PersistedAutismProfileState => {
  if (!isRecord(value)) return false;
  const nowNextLater = value.nowNextLater;

  return (
    typeof value.ownerId === 'string'
    && isAutismProfileValue(value.profile)
    && Array.isArray(value.schedule)
    && value.schedule.every((item) =>
      isRecord(item)
      && typeof item.id === 'string'
      && typeof item.label === 'string'
      && typeof item.icon === 'string'
      && typeof item.done === 'boolean')
    && isRecord(nowNextLater)
    && typeof nowNextLater.now === 'string'
    && typeof nowNextLater.next === 'string'
    && typeof nowNextLater.later === 'string'
    && Array.isArray(value.socialStories)
    && value.socialStories.every((story) =>
      isRecord(story)
      && typeof story.id === 'string'
      && typeof story.title === 'string'
      && isStringArray(story.panels))
  );
};

const autismProfilePersistScope = createChildScopedPersistScope<PersistedAutismProfileState>(
  'adaptbuddy-autism-profile',
);

export const useAutismProfileStore = create<AutismProfileState>()(
  persist(
    (set) => ({
      ownerId: null,
      hydrationStatus: 'idle',
      ...createInitialAutismProfileData(),

      updateProfile: (profile) =>
        set((state) => ({
          profile: {
            ...profile,
            childId: state.ownerId ?? profile.childId,
            updatedAt: new Date().toISOString(),
          },
        })),

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

      resetForChild: (childId) =>
        set({
          ownerId: childId,
          hydrationStatus: childId ? 'loading' : 'idle',
          ...createInitialAutismProfileData(childId ?? 'guest-child'),
        }),

      markReady: (childId) =>
        set((state) => state.ownerId === childId ? { hydrationStatus: 'ready' } : {}),

      markHydrationError: (childId) =>
        set((state) => state.ownerId === childId ? { hydrationStatus: 'error' } : {}),
    }),
    {
      name: 'adaptbuddy-autism-profile-v2',
      storage: autismProfilePersistScope.storage,
      skipHydration: true,
      version: 2,
      partialize: (state): PersistedAutismProfileState => ({
        ownerId: state.ownerId,
        profile: state.profile,
        schedule: state.schedule,
        nowNextLater: state.nowNextLater,
        socialStories: state.socialStories,
      }),
      merge: (persistedState, currentState) => {
        if (persistedState === undefined) return currentState;
        const persisted = isPersistedAutismProfileState(persistedState)
          ? persistedState
          : undefined;
        if (
          !persisted
          || persisted.ownerId !== currentState.ownerId
          || persisted.profile?.childId !== currentState.ownerId
        ) {
          throw new Error('Invalid or mismatched child autism profile state.');
        }
        return {
          ...currentState,
          ...persisted,
          ownerId: currentState.ownerId,
          hydrationStatus: currentState.hydrationStatus,
        };
      },
    },
  ),
);

export const beginAutismProfileScope = (childId: string): ChildScopeToken => {
  const token = autismProfilePersistScope.begin(childId);
  useAutismProfileStore.getState().resetForChild(token.childId);
  return token;
};

export const hydrateAutismProfileScope = async (
  token: ChildScopeToken,
): Promise<ChildHydrationResult> => {
  if (!autismProfilePersistScope.isCurrent(token)) return 'stale';
  await useAutismProfileStore.persist.rehydrate();
  if (!autismProfilePersistScope.isCurrent(token)) return 'stale';
  if (!useAutismProfileStore.persist.hasHydrated()) {
    useAutismProfileStore.getState().markHydrationError(token.childId);
    return 'error';
  }
  useAutismProfileStore.getState().markReady(token.childId);
  if (!autismProfilePersistScope.enable(token)) return 'stale';
  return 'ready';
};

export const unbindAutismProfileScope = (): void => {
  autismProfilePersistScope.unbind();
  useAutismProfileStore.getState().resetForChild(null);
};

export const getAutismProfileStorageKey = (childId: string): string =>
  autismProfilePersistScope.storageKey(childId);

export const updateAutismProfileForChild = (
  childId: string,
  profile: AutismProfile,
  expectedCurrentProfile?: AutismProfile,
): boolean => {
  const state = useAutismProfileStore.getState();
  if (
    state.ownerId !== childId
    || state.hydrationStatus !== 'ready'
    || (expectedCurrentProfile !== undefined && state.profile !== expectedCurrentProfile)
  ) return false;
  useAutismProfileStore.setState({
    profile: {
      ...profile,
      childId,
    },
  });
  return true;
};

export const shouldApplyRemoteAutismProfile = (
  localProfile: AutismProfile,
  remoteProfile: AutismProfile,
): boolean => {
  // A fresh default has not been saved by the child, so the server is the
  // useful source even though the default's construction timestamp is newer.
  if (localProfile.completedAt === null) return true;

  const localUpdatedAt = Date.parse(localProfile.updatedAt);
  const remoteUpdatedAt = Date.parse(remoteProfile.updatedAt);
  if (Number.isNaN(localUpdatedAt)) return true;
  if (Number.isNaN(remoteUpdatedAt)) return false;
  return remoteUpdatedAt >= localUpdatedAt;
};

export const selectAutismProfileForChild = (
  state: AutismProfileState,
  childId: string | null | undefined,
): AutismProfile | null =>
  childId &&
  state.ownerId === childId &&
  state.profile.childId === childId &&
  state.hydrationStatus === 'ready'
    ? state.profile
    : null;
