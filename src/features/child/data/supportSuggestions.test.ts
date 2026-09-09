import { getReadySupportSuggestions } from './supportSuggestions';

describe('getReadySupportSuggestions', () => {
  it('returns only live, unfinished support tools', () => {
    const suggestions = getReadySupportSuggestions(
      ['dyscalculia', 'dyspraxia'],
      new Set(['dyscalculia-number-line']),
    );

    expect(suggestions.map((activity) => activity.id)).toEqual([
      'dyspraxia-sequence-steps',
    ]);
    expect(suggestions.every((activity) => activity.availability !== 'planned')).toBe(true);
  });

  it('deduplicates profile choices and respects the display limit', () => {
    const suggestions = getReadySupportSuggestions(
      ['dyscalculia', 'dyscalculia', 'dyspraxia'],
      new Set(),
      2,
    );

    expect(suggestions.map((activity) => activity.id)).toEqual([
      'dyscalculia-number-line',
      'dyspraxia-sequence-steps',
    ]);
  });
});
