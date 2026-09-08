import { mapParentJournalEntry } from 'features/parent/services/parentDashboardService';
import { mapTeacherSupportSignal } from 'features/teacher/services/teacherDashboardService';

const sharedAdhdEntry = {
  id: 'entry-123',
  child_id: 'child-123',
  emotion: 'anxious',
  text: 'Task Breakdown Buddy completed. Blocker/state: too many steps.',
  ai_analysis: {
    emotion: 'anxious',
    riskLevel: 'medium',
    signalId: 'adhd-task-breakdown',
    signalLabel: 'ADHD task breakdown',
    signalCategory: 'cognitive',
    supportLevel: 'concern',
    parentInsight: 'ADHD support used for Write a paragraph: Write the title.',
    suggestedAction: 'Reveal one next step at a time.',
    moodScore: 55,
    focusScore: 45,
    calmScore: 52,
  },
  risk_level: 'medium',
  created_at: '2026-09-01T09:30:00.000Z',
};

describe('ADHD shared evidence adult-view contract', () => {
  it('preserves the complete support context for the parent dashboard', () => {
    const entry = mapParentJournalEntry(
      sharedAdhdEntry,
      new Map([['child-123', 'Ari']]),
    );

    expect(entry).toEqual({
      id: 'entry-123',
      childId: 'child-123',
      childName: 'Ari',
      emotion: 'anxious',
      signalId: 'adhd-task-breakdown',
      signalLabel: 'ADHD task breakdown',
      signalCategory: 'cognitive',
      supportLevel: 'concern',
      parentInsight: 'ADHD support used for Write a paragraph: Write the title.',
      suggestedAction: 'Reveal one next step at a time.',
      text: 'Task Breakdown Buddy completed. Blocker/state: too many steps.',
      riskLevel: 'medium',
      createdAt: '2026-09-01T09:30:00.000Z',
      moodScore: 55,
      focusScore: 45,
      calmScore: 52,
    });
  });

  it('preserves the live-signal fields used by the teacher dashboard', () => {
    const signal = mapTeacherSupportSignal(
      sharedAdhdEntry,
      new Map([
        [
          'child-123',
          {
            id: 'child-123',
            full_name: 'Ari Example',
            first_name: 'Ari',
            child_name: null,
            buddy_id: 'AB-123',
            neuro_types: ['adhd'],
            age: 10,
          },
        ],
      ]),
      {
        childName: true,
        neuroProfile: true,
        dailyMood: 'summary',
        worryDiaryText: false,
        safeguardingAlerts: true,
        academicTasks: true,
        personalNotes: false,
      },
    );

    expect(signal).toEqual({
      id: 'entry-123',
      childId: 'child-123',
      childName: 'Ari Example',
      emotion: 'anxious',
      signalLabel: 'ADHD task breakdown',
      signalCategory: 'cognitive',
      supportLevel: 'concern',
      riskLevel: 'medium',
      text: '',
      createdAt: '2026-09-01T09:30:00.000Z',
    });
  });
});
