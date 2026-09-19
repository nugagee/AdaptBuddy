import {
  getAllActivitiesForNeuro,
  type NeuroActivity,
} from './neuroDashboardContent';

export function getReadySupportSuggestions(
  neuroTypes: string[],
  completedIds: ReadonlySet<string>,
  limit = 3,
): NeuroActivity[] {
  const seen = new Set<string>();
  return neuroTypes
    .flatMap((neuroId) => getAllActivitiesForNeuro(neuroId))
    .filter((activity) => {
      if (
        activity.availability === 'planned'
        || completedIds.has(activity.id)
        || seen.has(activity.id)
      ) {
        return false;
      }
      seen.add(activity.id);
      return true;
    })
    .slice(0, Math.max(0, limit));
}
