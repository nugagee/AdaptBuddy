import { getAllActivitiesForNeuro } from './neuroDashboardContent';

test('Dysgraphia tracing is a real inline activity with unchanged trusted rewards', () => {
  const trace = getAllActivitiesForNeuro('dysgraphia').find(activity => activity.id === 'dysgraphia-trace-path');
  expect(trace).toEqual(expect.objectContaining({ neuroId: 'dysgraphia', title: 'Trace the Path', starsReward: 3, durationMinutes: 8 }));
  expect(trace?.availability).not.toBe('planned');
  expect(trace?.availabilityNote).toBeUndefined();
});

test('tracing catalogue copy offers equal alternatives without a treatment claim', () => {
  const trace = getAllActivitiesForNeuro('dysgraphia').find(activity => activity.id === 'dysgraphia-trace-path')!;
  expect(trace.description).toMatch(/drawing or using large step buttons/);
  expect(`${trace.description} ${trace.inspiration}`).not.toMatch(/therapy|build motor memory|treatment|cure/i);
});

test('all three Dysgraphia pathways are available and identifiers remain unique', () => {
  const activities = getAllActivitiesForNeuro('dysgraphia');
  expect(activities.map(activity => activity.id)).toEqual(expect.arrayContaining(['dysgraphia-voice-story', 'dysgraphia-word-bank', 'dysgraphia-trace-path']));
  expect(new Set(activities.map(activity => activity.id)).size).toBe(activities.length);
  expect(activities.filter(activity => activity.availability === 'planned')).toEqual([]);
});
