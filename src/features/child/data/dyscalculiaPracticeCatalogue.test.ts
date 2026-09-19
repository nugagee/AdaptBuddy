import { getAllActivitiesForNeuro, getDailyActivitiesForNeuro, isTrackableDailyActivity } from './neuroDashboardContent';
import { MATHS_PRACTICE_IDS, isDyscalculiaPracticeActivity, PATTERN_TOKENS, PATTERN_EXAMPLES, MATHS_STORIES, storyAnswer, quantityLabel } from 'features/child/components/dashboard/dyscalculiaPracticeContent';

test('all Dyscalculia tools are real and trackable while their trusted identifiers/rewards remain intact', () => {
  const activities = getAllActivitiesForNeuro('dyscalculia');
  expect(activities.map(item => item.id)).toEqual(['dyscalculia-number-line', ...MATHS_PRACTICE_IDS]);
  expect(activities.every(isTrackableDailyActivity)).toBe(true);
  expect(activities.map(item => item.starsReward)).toEqual([4, 3, 5]);
  expect(activities.map(item => item.durationMinutes)).toEqual([12, 10, 15]);
  expect(new Set(activities.map(item => item.id)).size).toBe(3);
  expect(activities.filter(item => item.availability === 'planned')).toHaveLength(0);
});

test('both new tools enter deterministic daily rotation and unknown IDs stay rejected', () => {
  expect(getDailyActivitiesForNeuro('dyscalculia', 1).map(item => item.id)).toEqual([...MATHS_PRACTICE_IDS]);
  expect(isDyscalculiaPracticeActivity('dyscalculia-number-line')).toBe(false);
  expect(isDyscalculiaPracticeActivity('not-real')).toBe(false);
  expect(MATHS_PRACTICE_IDS.every(isDyscalculiaPracticeActivity)).toBe(true);
});

test('all pattern tokens have textual labels and their worked continuations follow the stated rules', () => {
  const ids = new Set(PATTERN_TOKENS.map(item => item.id));
  PATTERN_EXAMPLES.forEach(example => {
    expect(example.expected).toHaveLength(2);
    expect([...example.sequence, ...example.expected, ...example.choices].every(id => ids.has(id))).toBe(true);
    expect(example.expected.every(id => example.choices.includes(id))).toBe(true);
  });
  const pair = PATTERN_EXAMPLES[0];
  expect([...pair.sequence, ...pair.expected]).toEqual(Array.from({ length: 6 }, (_, i) => ['circle', 'square'][i % 2]));
  const triple = PATTERN_EXAMPLES[1];
  expect([...triple.sequence, ...triple.expected]).toEqual(Array.from({ length: 8 }, (_, i) => ['circle', 'circle', 'triangle'][i % 3]));
  const growing = PATTERN_EXAMPLES[2];
  expect([...growing.sequence, ...growing.expected].map(Number)).toEqual([1, 2, 3, 4, 5, 6]);
  PATTERN_TOKENS.filter(item => item.count !== undefined).forEach(item => {
    expect(item.count).toBe(Number(item.id)); expect(item.label).toContain(String(item.count));
  });
});

test.each([['table', 5], ['fruit', 4], ['jug', 3]])('%s arithmetic is valid and all quantities fit its model', (id, answer) => {
  const story = MATHS_STORIES.find(item => item.id === id)!;
  expect(storyAnswer(story)).toBe(answer);
  expect(story.start).toBeGreaterThanOrEqual(0);
  expect(storyAnswer(story)).toBeGreaterThanOrEqual(0);
  expect(storyAnswer(story)).toBeLessThanOrEqual(story.max);
  expect(Number.isInteger(storyAnswer(story))).toBe(true);
  expect(quantityLabel(story, 0)).toBe(`0 ${story.plural}`);
  expect(quantityLabel(story, 1)).toBe(`1 ${story.unit}`);
});

test('the jug defines four equal measures and the catalogue makes no therapy or real cooking claim', () => {
  expect(MATHS_STORIES[2].capacity).toBe(4);
  expect(MATHS_STORIES[2].max).toBe(4);
  const newTools = getAllActivitiesForNeuro('dyscalculia').filter(item => isDyscalculiaPracticeActivity(item.id));
  expect(newTools.every(item => item.availability === 'ready' && !item.availabilityNote)).toBe(true);
  expect(newTools.map(item => item.description).join(' ')).toMatch(/pretend/);
  expect(newTools.map(item => item.description).join(' ')).not.toMatch(/therapy|treatment|diagnos|cure|comic/i);
});
