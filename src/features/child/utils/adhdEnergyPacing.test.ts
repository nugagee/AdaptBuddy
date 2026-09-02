import { NEURO_ACTIVITIES } from 'features/child/data/neuroDashboardContent';
import type { AdhdEnergyPacing } from 'features/child/store/childProgressStore';
import type { LearningRecommendation } from 'types/ai.types';
import {
  adaptAdhdActivitiesForEnergy,
  adaptRecommendationsForEnergy,
} from './adhdEnergyPacing';

const lowPacing: AdhdEnergyPacing = {
  energyId: 'low',
  energyLabel: 'Low battery',
  emoji: '🪫',
  taskMinutes: 5,
  breakMinutes: 3,
  recommendationMood: 'tired',
  plan: 'Use a short task and a proper reset.',
  firstStep: 'Choose the easiest visible action.',
  checkedAt: '2026-09-02T09:30:00.000Z',
};

describe('ADHD energy pacing', () => {
  it('caps ADHD task activities while preserving movement and regulation lengths', () => {
    const activityIds = [
      'adhd-focus-sprint',
      'adhd-quest-chain',
      'adhd-movement-burst',
      'adhd-break-prescription',
    ];
    const activities = NEURO_ACTIVITIES.filter((activity) => activityIds.includes(activity.id));
    const adapted = adaptAdhdActivitiesForEnergy(activities, lowPacing);
    const durations = Object.fromEntries(
      adapted.map((activity) => [activity.id, activity.durationMinutes]),
    );

    expect(durations['adhd-focus-sprint']).toBe(5);
    expect(durations['adhd-quest-chain']).toBe(5);
    expect(durations['adhd-movement-burst']).toBe(3);
    expect(durations['adhd-break-prescription']).toBe(4);
  });

  it('does not change non-ADHD activities or mutate the original list', () => {
    const original = NEURO_ACTIVITIES.filter((activity) => activity.id === 'dyslexia-read-aloud');
    const adapted = adaptAdhdActivitiesForEnergy(original, lowPacing);

    expect(adapted).toEqual(original);
    expect(adapted[0]).toBe(original[0]);
  });

  it('caps recommendation time and labels the active pace', () => {
    const recommendation: LearningRecommendation = {
      id: 'recommendation-1',
      title: 'Focus Flow',
      description: 'A focus activity.',
      learningStyle: 'visual',
      difficulty: 2,
      estimatedTime: 12,
      neuroProfileMatch: ['adhd'],
      aiConfidence: 0.9,
      tags: ['focus'],
    };

    expect(adaptRecommendationsForEnergy([recommendation], lowPacing)).toEqual([
      {
        ...recommendation,
        estimatedTime: 5,
        tags: ['focus', '5-min pace'],
      },
    ]);
  });
});
