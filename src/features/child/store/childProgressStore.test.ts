import type { AdhdSupportSignalInput } from './childProgressStore';
import { useChildProgressStore } from './childProgressStore';

const makeSignal = (
  overrides: Partial<AdhdSupportSignalInput> = {},
): AdhdSupportSignalInput => ({
  energyId: 'focused',
  energyLabel: 'Focused',
  firstStep: 'Open the first instruction.',
  rescueReason: 'too boring',
  supportPlan: 'Keep one task visible.',
  ...overrides,
});

const resetProgressStore = () => {
  useChildProgressStore.setState({
    completions: [],
    metricValues: [],
    adhdSupportSignals: [],
    achievementBadges: [],
    adhdEnergyPacing: null,
    dyslexiaReadingSessions: [],
    dyslexiaReaderPreferences: null,
    dyslexiaPhonicsSessions: [],
    starsTotal: 0,
    streakDays: 0,
    lastActiveDate: '',
    todayMood: null,
    focusMinutesToday: 0,
  });
};

describe('childProgressStore ADHD support signals', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-01T09:30:00.000Z'));
    window.localStorage.clear();
    resetProgressStore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stores an urgent overloaded signal locally with an adult check-in flag', () => {
    useChildProgressStore.getState().addAdhdSupportSignal(
      'adhd-focus-coach',
      makeSignal({ energyId: 'overloaded', energyLabel: 'Overloaded' }),
    );

    const [saved] = useChildProgressStore.getState().adhdSupportSignals;
    expect(saved).toEqual(
      expect.objectContaining({
        activityId: 'adhd-focus-coach',
        energyId: 'overloaded',
        needsCheckIn: true,
        createdAt: '2026-09-01T09:30:00.000Z',
      }),
    );
    expect(saved.id).toEqual(expect.any(String));
  });

  it('flags the second support-need pattern on the same day', () => {
    useChildProgressStore.getState().addAdhdSupportSignal(
      'adhd-focus-coach',
      makeSignal({ energyId: 'scattered', energyLabel: 'Scattered' }),
    );
    useChildProgressStore.getState().addAdhdSupportSignal(
      'adhd-task-breakdown',
      makeSignal({
        energyId: 'task-breakdown',
        energyLabel: 'Task breakdown',
        rescueReason: 'too many steps',
      }),
    );

    const [second, first] = useChildProgressStore.getState().adhdSupportSignals;
    expect(first.needsCheckIn).toBe(false);
    expect(second.needsCheckIn).toBe(true);
  });

  it('does not carry yesterday\'s support pattern into today', () => {
    jest.setSystemTime(new Date('2026-08-31T18:00:00.000Z'));
    useChildProgressStore.getState().addAdhdSupportSignal(
      'adhd-focus-coach',
      makeSignal({ energyId: 'scattered', energyLabel: 'Scattered' }),
    );

    jest.setSystemTime(new Date('2026-09-01T09:30:00.000Z'));
    useChildProgressStore.getState().addAdhdSupportSignal(
      'adhd-task-breakdown',
      makeSignal({
        energyId: 'task-breakdown',
        energyLabel: 'Task breakdown',
        rescueReason: 'too many steps',
      }),
    );

    expect(useChildProgressStore.getState().adhdSupportSignals[0].needsCheckIn).toBe(false);
  });

  it('keeps only the latest 30 local signals', () => {
    for (let index = 0; index < 32; index += 1) {
      useChildProgressStore.getState().addAdhdSupportSignal(
        'adhd-focus-coach',
        makeSignal({ firstStep: `Step ${index}` }),
      );
    }

    const signals = useChildProgressStore.getState().adhdSupportSignals;
    expect(signals).toHaveLength(30);
    expect(signals[0].firstStep).toBe('Step 31');
    expect(signals[29].firstStep).toBe('Step 2');
  });

  it('persists each achievement badge only once', () => {
    const badge = {
      id: 'adhd-chain-builder',
      title: 'Chain Builder',
      description: 'Completed three tiny wins in a row.',
      emoji: '🔗',
    };

    useChildProgressStore.getState().unlockAchievementBadge(badge);
    useChildProgressStore.getState().unlockAchievementBadge(badge);

    expect(useChildProgressStore.getState().achievementBadges).toEqual([
      {
        ...badge,
        unlockedAt: '2026-09-01T09:30:00.000Z',
      },
    ]);
  });

  it('stores only today\'s active ADHD pacing plan', () => {
    const pacing = {
      energyId: 'low',
      energyLabel: 'Low battery',
      emoji: '🪫',
      taskMinutes: 5,
      breakMinutes: 3,
      recommendationMood: 'tired',
      plan: 'Use a short task and a proper reset.',
      firstStep: 'Choose the easiest visible action.',
    };

    useChildProgressStore.getState().setAdhdEnergyPacing(pacing);

    expect(useChildProgressStore.getState().getTodayAdhdEnergyPacing()).toEqual({
      ...pacing,
      checkedAt: '2026-09-01T09:30:00.000Z',
    });

    jest.setSystemTime(new Date('2026-09-02T09:30:00.000Z'));
    expect(useChildProgressStore.getState().getTodayAdhdEnergyPacing()).toBeNull();
  });

  it('records structured dyslexia reading progress for today', () => {
    useChildProgressStore.getState().addDyslexiaReadingSession({
      passageId: 'moon-garden',
      passageTitle: 'The Moon Garden',
      sentencesCompleted: 3,
      totalSentences: 4,
      wordsRead: 24,
      speechRate: 0.8,
      supportsUsed: ['read aloud', 'cream overlay'],
    });

    expect(useChildProgressStore.getState().getTodayDyslexiaReadingSessions()).toEqual([
      expect.objectContaining({
        passageId: 'moon-garden',
        sentencesCompleted: 3,
        totalSentences: 4,
        wordsRead: 24,
        supportsUsed: ['read aloud', 'cream overlay'],
        createdAt: '2026-09-01T09:30:00.000Z',
      }),
    ]);
  });

  it('remembers the latest Dyslexia comfort reader setup', () => {
    useChildProgressStore.getState().setDyslexiaReaderPreferences({
      overlay: 'blue',
      textSize: 'extra-large',
      lineSpacing: 'extra-wide',
      lineWidth: 'narrow',
      readingRuler: true,
      dyslexiaFont: true,
    });

    expect(useChildProgressStore.getState().dyslexiaReaderPreferences).toEqual({
      overlay: 'blue',
      textSize: 'extra-large',
      lineSpacing: 'extra-wide',
      lineWidth: 'narrow',
      readingRuler: true,
      dyslexiaFont: true,
      updatedAt: '2026-09-01T09:30:00.000Z',
    });
  });

  it('records a structured Dyslexia phonics practice session', () => {
    useChildProgressStore.getState().addDyslexiaPhonicsSession({
      completedSoundIds: ['m-moon', 's-sun'],
      completedSounds: ['mmm', 'sss'],
      wordsPractised: ['moon', 'sun'],
      totalSounds: 4,
      listenCount: 3,
      confidence: 'practised',
      supportsUsed: ['sound playback', 'letter tracing', 'word chunks'],
    });

    expect(useChildProgressStore.getState().getTodayDyslexiaPhonicsSessions()).toEqual([
      expect.objectContaining({
        completedSoundIds: ['m-moon', 's-sun'],
        wordsPractised: ['moon', 'sun'],
        listenCount: 3,
        confidence: 'practised',
        createdAt: '2026-09-01T09:30:00.000Z',
      }),
    ]);
  });
});
