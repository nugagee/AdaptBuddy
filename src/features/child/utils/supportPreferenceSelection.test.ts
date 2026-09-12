import { toggleSupportPreference } from './supportPreferenceSelection';

describe('toggleSupportPreference', () => {
  it('adds a new support preference without replacing existing choices', () => {
    expect(toggleSupportPreference(['dyslexia'], 'dyscalculia')).toEqual([
      'dyslexia',
      'dyscalculia',
    ]);
  });

  it('removes only the selected preference', () => {
    expect(toggleSupportPreference(['dyslexia', 'dyspraxia'], 'dyslexia')).toEqual([
      'dyspraxia',
    ]);
  });

  it('does not create duplicate preferences', () => {
    expect(toggleSupportPreference(['adhd'], 'adhd')).toEqual([]);
  });
});
