import { getAllActivitiesForNeuro, getDailyActivitiesForNeuro, getMetricsForNeuros, isTrackableDailyActivity } from './neuroDashboardContent';
import { getReadySupportSuggestions } from './supportSuggestions';
import { AUDITORY_PRACTICE_IDS, AUDITORY_SPEECH_TEXTS, CAPTION_EXAMPLES, INSTRUCTION_EXAMPLES, isAuditoryPracticeActivity } from '../components/dashboard/auditoryPracticeContent';

test('only the two exact inline identifiers route to the new tools', () => {
  expect(AUDITORY_PRACTICE_IDS).toEqual(['auditory-caption-match', 'auditory-slow-speech']);
  AUDITORY_PRACTICE_IDS.forEach(id => expect(isAuditoryPracticeActivity(id)).toBe(true));
  ['', 'auditory-repeat-back', 'auditory-caption-match?stars=999'].forEach(id => expect(isAuditoryPracticeActivity(id)).toBe(false));
});

test('all three auditory tools are trackable with unchanged trusted rewards and one pronunciation route', () => {
  const tools = getAllActivitiesForNeuro('auditory');
  expect(tools.map(tool => [tool.id, tool.starsReward, tool.durationMinutes])).toEqual([
    ['auditory-caption-match', 4, 10], ['auditory-repeat-back', 3, 8], ['auditory-slow-speech', 3, 12],
  ]);
  expect(tools.every(isTrackableDailyActivity)).toBe(true);
  expect(tools.filter(tool => tool.availability === 'planned')).toHaveLength(0);
  expect(tools.filter(tool => tool.route?.includes('pronunciation'))).toHaveLength(1);
});

test('daily rotation reaches all three tools without duplicates', () => {
  const ids = [0, 1, 2].flatMap(seed => {
    const tools = getDailyActivitiesForNeuro('auditory', seed);
    expect(tools).toHaveLength(2); expect(new Set(tools.map(tool => tool.id)).size).toBe(2);
    return tools.map(tool => tool.id);
  });
  expect(new Set(ids).size).toBe(3);
});

test('suggestions filter completed tools and do not duplicate the expanded profile', () => {
  expect(getReadySupportSuggestions(['auditory', 'auditory'], new Set(['auditory-repeat-back']), 20).map(tool => tool.id))
    .toEqual(['auditory-caption-match', 'auditory-slow-speech']);
});

test('communication metrics do not mislabel text-only practice as verified listening or correctness', () => {
  expect(getMetricsForNeuros(['auditory'])).toEqual([expect.objectContaining({ label: 'Communication practices', unit: 'sessions' })]);
});

test('every caption has three distinctly labelled choices and exactly one known matching answer', () => {
  expect(CAPTION_EXAMPLES).toHaveLength(3);
  CAPTION_EXAMPLES.forEach(example => {
    expect(example.choices).toHaveLength(3); expect(new Set(example.choices.map(choice => choice.id)).size).toBe(3);
    expect(example.choices.filter(choice => choice.id === example.answerId)).toHaveLength(1);
    example.choices.forEach(choice => expect(choice.label).toMatch(/[A-Za-z]/));
  });
});

test('instruction examples have three short steps with real keyword substrings', () => {
  expect(INSTRUCTION_EXAMPLES).toHaveLength(3);
  INSTRUCTION_EXAMPLES.forEach(example => {
    expect(example.steps).toHaveLength(3);
    example.steps.forEach(step => { expect(step.text).toContain(step.keyword); expect(step.text.length).toBeLessThan(120); });
  });
});

test('speech allowlist contains only the twelve fixed texts and no arbitrary user input', () => {
  expect(AUDITORY_SPEECH_TEXTS.size).toBe(12);
  CAPTION_EXAMPLES.forEach(example => expect(AUDITORY_SPEECH_TEXTS.has(example.caption)).toBe(true));
  INSTRUCTION_EXAMPLES.forEach(example => example.steps.forEach(step => expect(AUDITORY_SPEECH_TEXTS.has(step.text)).toBe(true)));
  expect(AUDITORY_SPEECH_TEXTS.has('private child text')).toBe(false);
});

test('catalogue copy describes implemented tools instead of a nonexistent video or guaranteed playback speed', () => {
  const tools = getAllActivitiesForNeuro('auditory').filter(tool => isAuditoryPracticeActivity(tool.id));
  expect(tools[0].description).toMatch(/Read a caption/);
  expect(tools[1].description).toMatch(/optional speech-rate choices/);
  tools.forEach(tool => expect(tool.description).not.toMatch(/short clip|0.75×|hearing test|treatment/i));
});
