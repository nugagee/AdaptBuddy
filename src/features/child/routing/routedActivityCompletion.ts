import {
  getKnownActivityById,
  type NeuroActivity,
} from 'features/child/data/neuroDashboardContent';

export const ACTIVITY_QUERY_PARAM = 'activity';

const routePathname = (route: string): string => route.split('?')[0];

/**
 * Carry only a catalogue activity id between pages. Child identity and reward
 * data never enter the URL.
 */
export const buildActivityLaunchPath = (activity: NeuroActivity): string | null => {
  if (!activity.route) return null;
  if (!activity.completion) return activity.route;

  const [pathname, query = ''] = activity.route.split('?');
  const params = new URLSearchParams(query);
  params.set(ACTIVITY_QUERY_PARAM, activity.id);
  const encodedQuery = params.toString();
  return encodedQuery ? `${pathname}?${encodedQuery}` : pathname;
};

interface ResolveRoutedActivityInput {
  search: string | URLSearchParams;
  expectedPathname: string;
  neuroTypes: string[];
  completion: NonNullable<NeuroActivity['completion']>;
}

/**
 * Treat route state as untrusted. A launch is valid only when its id resolves
 * to a ready catalogue activity for this exact page and active neuro profile.
 */
export const resolveRoutedActivity = ({
  search,
  expectedPathname,
  neuroTypes,
  completion,
}: ResolveRoutedActivityInput): NeuroActivity | null => {
  const params = typeof search === 'string'
    ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    : search;
  const activityId = params.get(ACTIVITY_QUERY_PARAM);
  if (!activityId) return null;

  const activity = getKnownActivityById(activityId);
  if (
    !activity
    || activity.availability === 'planned'
    || !activity.route
    || activity.completion !== completion
    || routePathname(activity.route) !== expectedPathname
    || !neuroTypes.includes(activity.neuroId)
  ) {
    return null;
  }

  return activity;
};
