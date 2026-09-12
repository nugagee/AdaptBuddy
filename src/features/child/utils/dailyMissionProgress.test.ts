import type { ActivityCompletion } from 'features/child/store/childProgressStore';
import { getDailyMissionCompletions, getDailyMissionProgress } from './dailyMissionProgress';

const completion = (activityId: string, date = '2026-09-09'): ActivityCompletion => ({
  activityId,
  neuroId: 'dyscalculia',
  completedAt: `${date}T10:00:00.000Z`,
  starsEarned: 3,
  durationMinutes: 5,
});

describe('daily mission progress', () => {
  it('ignores completed expanded tools that are not in today\'s mission list', () => {
    const completed = getDailyMissionCompletions(
      [completion('daily-tool'), completion('expanded-tool')],
      ['daily-tool'],
      '2026-09-09',
    );

    expect(completed.map((item) => item.activityId)).toEqual(['daily-tool']);
    expect(getDailyMissionProgress(completed.length, 1)).toBe(100);
  });

  it('always keeps the accessible percentage within zero and one hundred', () => {
    expect(getDailyMissionProgress(4, 1)).toBe(100);
    expect(getDailyMissionProgress(-1, 2)).toBe(0);
    expect(getDailyMissionProgress(0, 0)).toBe(0);
  });
});
