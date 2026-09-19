import { resolveAutismTab } from './autismSpaceRouting';

describe('Autism Space tab routing', () => {
  it.each([
    ['schedule', 'schedule'],
    ['calm', 'calm'],
    ['story', 'story'],
    ['communication', 'communication'],
  ])('accepts the supported %s deep link', (input, expected) => {
    expect(resolveAutismTab(input)).toBe(expected);
  });

  it.each([null, '', 'sensory', 'admin'])('falls back safely for %s', (input) => {
    expect(resolveAutismTab(input)).toBe('profile');
  });
});
