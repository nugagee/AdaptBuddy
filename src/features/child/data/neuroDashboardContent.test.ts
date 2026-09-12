import {
  getAllActivitiesForNeuro,
  getDailyActivitiesForNeuro,
  getToolsForNeuros,
  isTrackableDailyActivity,
} from './neuroDashboardContent';

describe('neuroDashboardContent availability', () => {
  it('offers all three implemented Dyscalculia tools in deterministic daily rotation', () => {
  expect(getDailyActivitiesForNeuro('dyscalculia', 1).map(activity => activity.id)).toEqual([
    'dyscalculia-pattern-blocks', 'dyscalculia-real-world',
  ]);
  const expanded = getAllActivitiesForNeuro('dyscalculia');
  expect(expanded.filter(isTrackableDailyActivity).map(activity => activity.id)).toEqual([
    'dyscalculia-number-line', 'dyscalculia-pattern-blocks', 'dyscalculia-real-world',
  ]);
  expect(expanded.filter(activity => activity.availability === 'planned')).toEqual([]);
});

  it('offers the three implemented Dyspraxia tools without an unrelated pronunciation activity', () => {
    expect(getDailyActivitiesForNeuro('dyspraxia', 2).map((activity) => activity.id)).toEqual([
      'dyspraxia-gross-motor', 'dyspraxia-fine-motor',
    ]);
    expect(getAllActivitiesForNeuro('dyspraxia').filter(isTrackableDailyActivity).map(activity => activity.id)).toEqual([
      'dyspraxia-fine-motor', 'dyspraxia-sequence-steps', 'dyspraxia-gross-motor',
    ]);
    expect(getAllActivitiesForNeuro('dyspraxia').some(
      (activity) => activity.id === 'dyspraxia-pronunciation-buddy',
    )).toBe(false);
  });

  it('offers the three implemented Dysgraphia activities with deterministic daily rotation', () => {
    expect(getDailyActivitiesForNeuro('dysgraphia', 1).map((activity) => activity.id)).toEqual([
      'dysgraphia-trace-path',
      'dysgraphia-word-bank',
    ]);
    expect(getAllActivitiesForNeuro('dysgraphia').filter(
      (activity) => isTrackableDailyActivity(activity),
    ).map((activity) => activity.id)).toEqual([
      'dysgraphia-voice-story',
      'dysgraphia-trace-path',
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

  it('offers the three implemented Visual Stress tools through real daily and expanded pathways', () => {
    expect(getDailyActivitiesForNeuro('visual-stress', 3).map((activity) => activity.id)).toEqual([
      'visual-comfort-read', 'visual-font-lab',
    ]);
    const tools = getAllActivitiesForNeuro('visual-stress');
    expect(tools.map((activity) => activity.id)).toEqual([
      'visual-comfort-read', 'visual-font-lab', 'visual-break-2020',
    ]);
    expect(tools.every((activity) => activity.availability === 'ready' && isTrackableDailyActivity(activity))).toBe(true);
  });

  it('still refuses daily tracking when an activity is explicitly planned', () => {
    const realTool = getAllActivitiesForNeuro('visual-stress')[0];
    expect(isTrackableDailyActivity({ ...realTool, availability: 'planned' })).toBe(false);
    expect(getDailyActivitiesForNeuro('unknown-profile', 3)).toEqual([]);
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
