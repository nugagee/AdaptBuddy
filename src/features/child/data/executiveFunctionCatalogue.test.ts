import { ACTIVE_NEURO_IDS, NEURO_OPTION_MAP } from 'constants/neuroOptions';
import {
  getAllActivitiesForNeuro, getDailyActivitiesForNeuro, getKnownActivityById,
  getMetricsForNeuros, getToolsForNeuros, isTrackableDailyActivity, NEURO_ZONE_META,
} from './neuroDashboardContent';
import { EXECUTIVE_ACTIVITY_IDS, isExecutiveFunctionActivity } from '../components/dashboard/executiveFunctionContent';

describe('Executive Function activation contract', () => {
  it('activates all twelve defined profiles only with usable pathways', () => {
    expect(ACTIVE_NEURO_IDS.has('executive-function')).toBe(true);
    expect(ACTIVE_NEURO_IDS.size).toBe(12);
    expect(Array.from(ACTIVE_NEURO_IDS).every((id) => getDailyActivitiesForNeuro(id).length > 0)).toBe(true);
    expect(ACTIVE_NEURO_IDS.has('executive-function-forged')).toBe(false);
    expect(NEURO_OPTION_MAP['executive-function'].description).toMatch(/first step/i);
    expect(NEURO_ZONE_META['executive-function'].dailyGoalLabel).toBe('Optional planning practice');
  });
  it('has exactly three real, known, in-place completion paths', () => {
    const activities = getAllActivitiesForNeuro('executive-function');
    expect(activities.map((activity) => activity.id)).toEqual([...EXECUTIVE_ACTIVITY_IDS]);
    for (const activity of activities) {
      expect(activity.availability).toBe('ready');
      expect(isTrackableDailyActivity(activity)).toBe(true);
      expect(isExecutiveFunctionActivity(activity.id)).toBe(true);
      expect(getKnownActivityById(activity.id)).toEqual(activity);
      expect(activity.route).toBeUndefined();
      expect(activity.starsReward).toBe(3);
    }
  });
  it('rotates distinct usable daily missions rather than placeholders', () => {
    for (let day = 1; day <= 31; day++) {
      const activities = getDailyActivitiesForNeuro('executive-function', day);
      expect(activities).toHaveLength(2);
      expect(new Set(activities.map((item) => item.id)).size).toBe(2);
      expect(activities.every((item) => isExecutiveFunctionActivity(item.id))).toBe(true);
    }
  });
  it('offers comfort controls and a practice count, not a clinical score', () => {
    expect(getToolsForNeuros(['executive-function']).map((tool) => tool.action)).toEqual(['font-up', 'reduced-motion']);
    expect(getMetricsForNeuros(['executive-function'])).toEqual([
      expect.objectContaining({ neuroId: 'executive-function', label: 'Planning practices', unit: 'sessions' }),
    ]);
    expect(getKnownActivityById('executive-function-forged')).toBeNull();
    expect(getDailyActivitiesForNeuro('unsupported-profile')).toEqual([]);
  });
});
