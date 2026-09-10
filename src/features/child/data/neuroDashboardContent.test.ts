import {
  getAllActivitiesForNeuro,
  getDailyActivitiesForNeuro,
  getToolsForNeuros,
  isTrackableDailyActivity,
} from './neuroDashboardContent';

describe('neuroDashboardContent availability', () => {
  it('offers the live Dyscalculia number-line tool once and keeps planned tools out of daily work', () => {
    expect(getDailyActivitiesForNeuro('dyscalculia', 1).map((activity) => activity.id)).toEqual([
      'dyscalculia-number-line',
    ]);

    const expanded = getAllActivitiesForNeuro('dyscalculia');
    expect(expanded.filter((activity) => activity.availability !== 'planned').map((activity) => activity.id)).toEqual([
      'dyscalculia-number-line',
    ]);
    expect(expanded.filter((activity) => activity.availability === 'planned')).toHaveLength(2);
  });

  it('offers the live Dyspraxia planner without an unrelated pronunciation activity', () => {
    expect(getDailyActivitiesForNeuro('dyspraxia', 2).map((activity) => activity.id)).toEqual([
      'dyspraxia-sequence-steps',
    ]);
    expect(getAllActivitiesForNeuro('dyspraxia').some(
      (activity) => activity.id === 'dyspraxia-pronunciation-buddy',
    )).toBe(false);
  });

  it('offers the in-place and bridged Dysgraphia activities for daily practice', () => {
    expect(getDailyActivitiesForNeuro('dysgraphia', 1).map((activity) => activity.id)).toEqual([
      'dysgraphia-word-bank',
      'dysgraphia-voice-story',
    ]);
    expect(getAllActivitiesForNeuro('dysgraphia').filter(
      (activity) => isTrackableDailyActivity(activity),
    ).map((activity) => activity.id)).toEqual([
      'dysgraphia-voice-story',
      'dysgraphia-word-bank',
    ]);
  });

  it('offers child-led sensory work and only the routed sound pages with completion bridges', () => {
    expect(getDailyActivitiesForNeuro('spd', 1).map((activity) => activity.id)).toEqual([
      'spd-sensory-checklist',
      'spd-soundscape',
    ]);
    expect(getAllActivitiesForNeuro('spd').filter(
      (activity) => isTrackableDailyActivity(activity),
    ).map((activity) => activity.id)).toEqual([
      'spd-calm-corner',
      'spd-sensory-checklist',
      'spd-soundscape',
    ]);
  });

  it('does not turn a planned-only profile into a fake ready activity', () => {
    expect(getDailyActivitiesForNeuro('visual-stress', 3)).toEqual([]);
    expect(getAllActivitiesForNeuro('visual-stress').every(
      (activity) => activity.availability === 'planned',
    )).toBe(true);
  });

  it('offers voice writing, but not pronunciation, as a Dyspraxia access option', () => {
    const toolIds = getToolsForNeuros(['dyspraxia']).map((tool) => tool.id);
    expect(toolIds).toContain('tool-writing');
    expect(toolIds).not.toContain('tool-pronunciation');
  });

  it('does not duplicate the auditory listen-and-repeat route', () => {
    expect(getAllActivitiesForNeuro('auditory').filter(
      (activity) => activity.route?.includes('pronunciation'),
    )).toHaveLength(1);
  });

  it('offers the three in-place Autism tools and bridged pronunciation support', () => {
    expect(getDailyActivitiesForNeuro('autism', 1).map((activity) => activity.id)).toEqual([
      'autism-social-story',
      'autism-pronunciation-buddy',
    ]);
    const autismTools = getAllActivitiesForNeuro('autism');
    expect(autismTools.filter(isTrackableDailyActivity).map((activity) => activity.id)).toEqual([
      'autism-visual-schedule',
      'autism-social-story',
      'autism-pronunciation-buddy',
      'autism-pattern-calm',
    ]);
    expect(autismTools.find((activity) => activity.id === 'autism-sensory-break')?.route)
      .toBe('/autism-space?tab=calm');
    expect(autismTools.find((activity) => activity.id === 'autism-pronunciation-buddy')?.route)
      .toBe('/pronunciation-buddy');
  });
});
