import { saveJournalEntry } from 'services/supabase/autismProfileService';
import type { AdhdSupportSignalInput } from 'features/child/store/childProgressStore';
import { syncAdhdSupportSignal } from './adhdSupportSignalService';

jest.mock('services/supabase/autismProfileService', () => ({
  saveJournalEntry: jest.fn(),
}));

const mockSaveJournalEntry = saveJournalEntry as jest.MockedFunction<typeof saveJournalEntry>;

const makeSignal = (
  overrides: Partial<AdhdSupportSignalInput> = {},
): AdhdSupportSignalInput => ({
  energyId: 'focused',
  energyLabel: 'Focused',
  firstStep: 'Open the task and read the first instruction.',
  rescueReason: 'too boring',
  supportPlan: 'Protect the flow: one task, no switching.',
  ...overrides,
});

describe('syncAdhdSupportSignal', () => {
  beforeEach(() => {
    mockSaveJournalEntry.mockReset();
    mockSaveJournalEntry.mockResolvedValue(undefined);
  });

  it('does not send guest activity data to the shared evidence service', async () => {
    await syncAdhdSupportSignal({
      childId: 'guest-child',
      activityId: 'adhd-focus-coach',
      activityTitle: 'ADHD Focus Coach',
      signal: makeSignal(),
    });

    expect(mockSaveJournalEntry).not.toHaveBeenCalled();
  });

  it('saves a low-risk learning check-in privately, including its derived analysis', async () => {
    await syncAdhdSupportSignal({
      childId: 'child-123',
      activityId: 'adhd-focus-coach',
      activityTitle: 'ADHD Focus Coach',
      signal: makeSignal(),
    });

    expect(mockSaveJournalEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        childId: 'child-123',
        emotion: 'calm',
        isShared: false,
        text: expect.stringContaining('ADHD Focus Coach completed.'),
        analysis: expect.objectContaining({
          riskLevel: 'low',
          supportLevel: 'positive',
          signalLabel: 'ADHD Focused',
          signalCategory: 'cognitive',
          source: 'adhd_support_signal',
          activityLabel: 'ADHD Focus Coach',
          parentInsight: expect.stringContaining('ADHD support signal'),
          suggestedAction: 'Protect the flow: one task, no switching.',
          moodScore: 75,
          focusScore: 72,
          calmScore: 76,
          timestamp: expect.any(Date),
        }),
      }),
    );
  });

  it('marks repeated executive-function blockers as a medium concern', async () => {
    await syncAdhdSupportSignal({
      childId: 'child-123',
      activityId: 'adhd-task-breakdown',
      activityTitle: 'Task Breakdown Buddy',
      signal: makeSignal({
        energyId: 'task-breakdown',
        energyLabel: 'Task breakdown',
        rescueReason: 'too many steps',
        taskTitle: 'Write a paragraph about plants',
        breakdownSteps: ['Write the title.', 'Add one idea.'],
      }),
    });

    expect(mockSaveJournalEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('Tiny steps: Write the title. / Add one idea.'),
        analysis: expect.objectContaining({
          emotion: 'anxious',
          riskLevel: 'medium',
          supportLevel: 'concern',
          signalLabel: 'ADHD task breakdown',
          signalCategory: 'cognitive',
          parentInsight: expect.stringContaining('Write a paragraph about plants'),
        }),
      }),
    );
  });

  it('marks overloaded and cannot-start signals as urgent', async () => {
    await syncAdhdSupportSignal({
      childId: 'child-123',
      activityId: 'adhd-focus-coach',
      activityTitle: 'ADHD Focus Coach',
      signal: makeSignal({
        energyId: 'overloaded',
        energyLabel: 'Overloaded',
        rescueReason: 'do not know where to start',
      }),
    });

    expect(mockSaveJournalEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        emotion: 'anxious',
        analysis: expect.objectContaining({
          riskLevel: 'high',
          supportLevel: 'urgent',
          moodScore: 35,
          focusScore: 28,
          calmScore: 30,
        }),
      }),
    );
  });

  it('classifies break prescriptions as regulation evidence', async () => {
    await syncAdhdSupportSignal({
      childId: 'child-123',
      activityId: 'adhd-break-prescription',
      activityTitle: 'Break Prescription',
      signal: makeSignal({
        energyId: 'tired',
        energyLabel: 'Tired',
        rescueReason: 'water and stretch',
        taskTitle: 'Water and stretch break',
      }),
    });

    expect(mockSaveJournalEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        emotion: 'tired',
        analysis: expect.objectContaining({
          signalLabel: 'ADHD Water and stretch break',
          signalCategory: 'regulation',
        }),
      }),
    );
  });

  it('classifies Energy Check-In as regulation evidence and escalates overload', async () => {
    await syncAdhdSupportSignal({
      childId: 'child-123',
      activityId: 'adhd-mood-check',
      activityTitle: 'Energy Check-In',
      signal: makeSignal({
        energyId: 'overloaded',
        energyLabel: 'Overloaded',
        rescueReason: 'overloaded',
      }),
    });

    expect(mockSaveJournalEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        emotion: 'anxious',
        analysis: expect.objectContaining({
          signalCategory: 'regulation',
          riskLevel: 'high',
          supportLevel: 'urgent',
        }),
      }),
    );
  });

  it('lets sync failures reach the caller so the dashboard can retain the local-only state', async () => {
    const syncError = new Error('network unavailable');
    mockSaveJournalEntry.mockRejectedValue(syncError);

    await expect(
      syncAdhdSupportSignal({
        childId: 'child-123',
        activityId: 'adhd-focus-coach',
        activityTitle: 'ADHD Focus Coach',
        signal: makeSignal(),
      }),
    ).rejects.toBe(syncError);
  });
});
