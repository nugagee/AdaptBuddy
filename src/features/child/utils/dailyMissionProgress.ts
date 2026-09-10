import type { ActivityCompletion } from 'features/child/store/childProgressStore';

export function getDailyMissionCompletions(
  completions: ActivityCompletion[],
  activityIds: string[],
  date: string,
): ActivityCompletion[] {
  const dailyIds = new Set(activityIds);
  return completions.filter(
    (completion) => completion.completedAt.startsWith(date) && dailyIds.has(completion.activityId),
  );
}

export function getDailyMissionProgress(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
}
