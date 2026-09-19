import { getAllActivitiesForNeuro, getDailyActivitiesForNeuro, getKnownActivityById, getMetricsForNeuros, isTrackableDailyActivity, NEURO_ACTIVITIES, NEURO_ZONE_META } from './neuroDashboardContent';
import { getReadySupportSuggestions } from './supportSuggestions';
import { BREAK_MESSAGES, FLOW_BOARDS, isTouretteSupportActivity, TOURETTE_SUPPORT_IDS } from '../components/dashboard/touretteSupportContent';

test('only the two exact Tourette identifiers receive dedicated support routing', () => {
  expect(TOURETTE_SUPPORT_IDS).toEqual(['tourettes-flex-flow', 'tourettes-tic-break']);
  TOURETTE_SUPPORT_IDS.forEach(id => expect(isTouretteSupportActivity(id)).toBe(true));
  ['', 'tourettes-creative-free', 'tourettes-flex-flow?stars=100', 'adhd-focus-coach'].forEach(id => expect(isTouretteSupportActivity(id)).toBe(false));
});

test('all three Tourette tools are available with original trusted completion metadata', () => {
  const tools = getAllActivitiesForNeuro('tourettes');
  expect(tools.map(tool => [tool.id, tool.starsReward, tool.durationMinutes])).toEqual([
    ['tourettes-flex-flow', 4, 15], ['tourettes-tic-break', 2, 3], ['tourettes-creative-free', 4, 12],
  ]);
  expect(tools.every(isTrackableDailyActivity)).toBe(true);
  expect(tools.filter(tool => tool.availability === 'planned')).toEqual([]);
  expect(tools[2]).toEqual(expect.objectContaining({ completion: 'writing-save', action: 'writing' }));
});

test('daily rotation reaches each implemented tool without duplicates', () => {
  const found = new Set<string>();
  [0, 1, 2].forEach(seed => {
    const day = getDailyActivitiesForNeuro('tourettes', seed); expect(day).toHaveLength(2);
    expect(new Set(day.map(tool => tool.id)).size).toBe(2); day.forEach(tool => found.add(tool.id));
  });
  expect(Array.from(found)).toEqual(['tourettes-flex-flow', 'tourettes-tic-break', 'tourettes-creative-free']);
});

test('suggestions deduplicate and filter already-completed support tools', () => {
  expect(getReadySupportSuggestions(['tourettes', 'tourettes'], new Set()).map(tool => tool.id)).toEqual([
    'tourettes-flex-flow', 'tourettes-tic-break', 'tourettes-creative-free',
  ]);
  expect(getReadySupportSuggestions(['tourettes'], new Set(TOURETTE_SUPPORT_IDS)).map(tool => tool.id)).toEqual(['tourettes-creative-free']);
});

test('practice labels do not misreport tic reduction, calmness or official break permission', () => {
  expect(getMetricsForNeuros(['tourettes'])).toEqual([expect.objectContaining({ label: 'Support practices', unit: 'sessions' })]);
  expect(getKnownActivityById('tourettes-flex-flow')?.description).toMatch(/in this tab/);
  expect(getKnownActivityById('tourettes-tic-break')?.description).toMatch(/no automatic message or permission/);
  expect(NEURO_ZONE_META.tourettes.tagline).toMatch(/breaks never need to be earned/);
});

test('all creative options and support messages have distinct readable labels', () => {
  expect(FLOW_BOARDS).toHaveLength(3); expect(new Set(FLOW_BOARDS.map(board => board.id)).size).toBe(3);
  FLOW_BOARDS.forEach(board => { expect(board.cards).toHaveLength(3); expect(new Set(board.cards.map(card => card.label)).size).toBe(3); });
  expect(BREAK_MESSAGES).toHaveLength(3); expect(new Set(BREAK_MESSAGES).size).toBe(3);
  BREAK_MESSAGES.forEach(message => expect(message).not.toMatch(/diagnosis|Tourette|tic-free|stop tic/i));
});

test('the twelve defined support zones all have actual available daily pathways', () => {
  expect(Object.keys(NEURO_ZONE_META)).toHaveLength(12);
  Object.keys(NEURO_ZONE_META).forEach(id => {
    const day = getDailyActivitiesForNeuro(id, 0);
    expect(day.length).toBeGreaterThan(0); expect(day.every(isTrackableDailyActivity)).toBe(true);
  });
});

test('the completed Batch 2 catalogue has no remaining planned activities or duplicate identifiers', () => {
  expect(NEURO_ACTIVITIES.filter(activity => activity.availability === 'planned').map(activity => activity.id)).toEqual([]);
  expect(new Set(NEURO_ACTIVITIES.map(activity => activity.id)).size).toBe(NEURO_ACTIVITIES.length);
  // A future explicitly planned entry must still be blocked, independent of today's empty list.
  expect(isTrackableDailyActivity({ ...NEURO_ACTIVITIES[0], availability: 'planned' })).toBe(false);
});
