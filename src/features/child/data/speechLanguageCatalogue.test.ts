import { ACTIVE_NEURO_IDS, NEURO_OPTION_MAP } from 'constants/neuroOptions';
import {
  getAllActivitiesForNeuro, getDailyActivitiesForNeuro, getKnownActivityById,
  getMetricsForNeuros, getToolsForNeuros, isTrackableDailyActivity, NEURO_ZONE_META,
} from './neuroDashboardContent';
import { SPEECH_LANGUAGE_ACTIVITY_IDS, isSpeechLanguageActivity } from '../components/dashboard/speechLanguageContent';

describe('Speech and Language activation contract', () => {
  it('keeps the implemented communication profile active', () => {
    expect(ACTIVE_NEURO_IDS.has('speech-language')).toBe(true);
    expect(ACTIVE_NEURO_IDS.has('speech-language-forged')).toBe(false);
    expect(NEURO_OPTION_MAP['speech-language'].description).toMatch(/phrase cards/i);
    expect(NEURO_ZONE_META['speech-language'].dailyGoalLabel).toBe('Optional communication practice');
  });
  it('has exactly three real, known, in-place completion paths', () => {
    const activities = getAllActivitiesForNeuro('speech-language');
    expect(activities.map((activity) => activity.id)).toEqual([...SPEECH_LANGUAGE_ACTIVITY_IDS]);
    for (const activity of activities) {
      expect(activity.availability).toBe('ready');
      expect(isTrackableDailyActivity(activity)).toBe(true);
      expect(isSpeechLanguageActivity(activity.id)).toBe(true);
      expect(getKnownActivityById(activity.id)).toEqual(activity);
      expect(activity.route).toBeUndefined();
      expect(activity.starsReward).toBe(3);
    }
  });
  it('rotates distinct usable daily missions rather than placeholders', () => {
    for (let day = 1; day <= 31; day++) {
      const activities = getDailyActivitiesForNeuro('speech-language', day);
      expect(activities).toHaveLength(2);
      expect(new Set(activities.map((item) => item.id)).size).toBe(2);
      expect(activities.every((item) => isSpeechLanguageActivity(item.id))).toBe(true);
    }
  });
  it('offers comfort controls and a practice count, not a clinical score', () => {
    expect(getToolsForNeuros(['speech-language']).map((tool) => tool.action)).toEqual(['font-up', 'reduced-motion']);
    expect(getMetricsForNeuros(['speech-language'])).toEqual([
      expect.objectContaining({ neuroId: 'speech-language', label: 'Practice sessions', unit: 'sessions' }),
    ]);
    expect(getKnownActivityById('speech-language-forged')).toBeNull();
    expect(getDailyActivitiesForNeuro('unsupported-profile')).toEqual([]);
  });
});
