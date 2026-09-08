import type { NeuroActivity } from 'features/child/data/neuroDashboardContent';
import type { AdhdEnergyPacing } from 'features/child/store/childProgressStore';
import type { LearningRecommendation } from 'types/ai.types';

const shouldAdaptActivity = (activity: NeuroActivity): boolean =>
  activity.neuroId === 'adhd'
  && activity.id !== 'adhd-mood-check'
  && activity.category !== 'regulation'
  && activity.category !== 'motor';

export const adaptAdhdActivitiesForEnergy = (
  activities: NeuroActivity[],
  pacing: AdhdEnergyPacing | null,
): NeuroActivity[] => {
  if (!pacing) return activities;

  return activities.map((activity) => {
    if (!shouldAdaptActivity(activity)) return activity;

    return {
      ...activity,
      durationMinutes: Math.min(activity.durationMinutes, pacing.taskMinutes),
    };
  });
};

export const adaptRecommendationsForEnergy = (
  recommendations: LearningRecommendation[],
  pacing: AdhdEnergyPacing | null,
): LearningRecommendation[] => {
  if (!pacing) return recommendations;

  return recommendations.map((recommendation) => ({
    ...recommendation,
    estimatedTime: Math.min(recommendation.estimatedTime, pacing.taskMinutes),
    tags: [
      ...recommendation.tags.filter((tag) => !/min pace$/i.test(tag)),
      `${pacing.taskMinutes}-min pace`,
    ],
  }));
};
