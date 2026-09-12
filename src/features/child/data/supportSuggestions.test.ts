import { getReadySupportSuggestions } from './supportSuggestions';
import * as catalogue from './neuroDashboardContent';

describe('getReadySupportSuggestions', () => {
  it('returns only live, unfinished support tools including the new motor practices', () => {
    const suggestions = getReadySupportSuggestions(
      ['dyscalculia', 'dyspraxia'],
      new Set(['dyscalculia-number-line']),
    );
    expect(suggestions.map((activity) => activity.id)).toEqual([
      'dyscalculia-pattern-blocks', 'dyscalculia-real-world', 'dyspraxia-fine-motor',
    ]);
    expect(suggestions.every((activity) => activity.availability !== 'planned')).toBe(true);
  });

  it('deduplicates profile choices and respects the display limit', () => {
    const suggestions = getReadySupportSuggestions(['dyscalculia', 'dyscalculia', 'dyspraxia'], new Set(), 2);
    expect(suggestions.map((activity) => activity.id)).toEqual(['dyscalculia-number-line', 'dyscalculia-pattern-blocks']);
  });

  it('deduplicates the complete expanded catalogue without relying on truncation', () => {
    const suggestions = getReadySupportSuggestions(['dyscalculia', 'dyscalculia', 'dyspraxia'], new Set(), 20);
    expect(suggestions.map(activity => activity.id)).toEqual([
      'dyscalculia-number-line', 'dyscalculia-pattern-blocks', 'dyscalculia-real-world',
      'dyspraxia-fine-motor', 'dyspraxia-sequence-steps', 'dyspraxia-gross-motor',
    ]);
    expect(new Set(suggestions.map(activity => activity.id)).size).toBe(suggestions.length);
  });

  it('filters completed new maths tools as well as the earlier Number Line tool', () => {
    const suggestions = getReadySupportSuggestions(['dyscalculia', 'dyspraxia'], new Set([
      'dyscalculia-number-line', 'dyscalculia-pattern-blocks', 'dyscalculia-real-world',
    ]));
    expect(suggestions.map(activity => activity.id)).toEqual(['dyspraxia-fine-motor', 'dyspraxia-sequence-steps', 'dyspraxia-gross-motor']);
  });

  it.each([0, -1])('returns no suggestions for display limit %s', limit => {
    expect(getReadySupportSuggestions(['dyscalculia'], new Set(), limit)).toEqual([]);
  });

  it('filters both completed motor tools while retaining the uncompleted planner', () => {
    expect(getReadySupportSuggestions(['dyspraxia', 'dyspraxia'], new Set(['dyspraxia-fine-motor', 'dyspraxia-gross-motor'])).map(tool => tool.id))
      .toEqual(['dyspraxia-sequence-steps']);
  });

  it('offers all three implemented auditory activities in exact catalogue order', () => {
    expect(getReadySupportSuggestions(['auditory'], new Set()).map(tool => tool.id)).toEqual([
      'auditory-caption-match', 'auditory-repeat-back', 'auditory-slow-speech',
    ]);
  });

  it('still excludes planned entries independently of which real profiles have been finished', () => {
    const real = catalogue.getAllActivitiesForNeuro('auditory')[0];
    const source = jest.spyOn(catalogue, 'getAllActivitiesForNeuro').mockReturnValue([
      { ...real, id: 'fixture-planned', availability: 'planned' },
      { ...real, id: 'fixture-ready', availability: 'ready' },
    ]);
    try {
      expect(getReadySupportSuggestions(['synthetic-profile'], new Set()).map(tool => tool.id)).toEqual(['fixture-ready']);
    } finally {
      source.mockRestore();
    }
  });
});
