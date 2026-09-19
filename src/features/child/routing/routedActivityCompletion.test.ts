import { ROUTES } from 'constants/routes';
import { getKnownActivityById } from 'features/child/data/neuroDashboardContent';
import {
  buildActivityLaunchPath,
  resolveRoutedActivity,
} from './routedActivityCompletion';

describe('routed activity completion contract', () => {
  it('launches a bridged activity with only its opaque catalogue id', () => {
    const activity = getKnownActivityById('dysgraphia-voice-story')!;
    expect(buildActivityLaunchPath(activity)).toBe(
      '/writing-pad?activity=dysgraphia-voice-story',
    );
  });

  it('preserves a non-trackable deep link without adding a reward query', () => {
    const activity = getKnownActivityById('autism-sensory-break')!;
    expect(buildActivityLaunchPath(activity)).toBe('/autism-space?tab=calm');
  });

  it('returns catalogue-owned values for a valid exact route and profile', () => {
    const activity = resolveRoutedActivity({
      search: '?activity=dysgraphia-voice-story&stars=999&neuroId=admin',
      expectedPathname: ROUTES.WRITING_PAD,
      neuroTypes: ['dysgraphia'],
      completion: 'writing-save',
    });

    expect(activity).toMatchObject({
      id: 'dysgraphia-voice-story',
      neuroId: 'dysgraphia',
      starsReward: 5,
      durationMinutes: 12,
    });
  });

  it.each([
    ['unknown id', '?activity=not-real', ROUTES.WRITING_PAD, ['dysgraphia'], 'writing-save'],
    ['wrong page', '?activity=dysgraphia-voice-story', ROUTES.MUSIC, ['dysgraphia'], 'writing-save'],
    ['wrong profile', '?activity=dysgraphia-voice-story', ROUTES.WRITING_PAD, ['autism'], 'writing-save'],
    ['wrong bridge', '?activity=dysgraphia-voice-story', ROUTES.WRITING_PAD, ['dysgraphia'], 'sound-session'],
    ['missing id', '', ROUTES.WRITING_PAD, ['dysgraphia'], 'writing-save'],
  ] as const)('rejects %s', (_label, search, expectedPathname, neuroTypes, completion) => {
    expect(resolveRoutedActivity({ search, expectedPathname, neuroTypes: [...neuroTypes], completion }))
      .toBeNull();
  });

  it('resolves the generated Dyslexia pronunciation tool from the catalogue', () => {
    expect(resolveRoutedActivity({
      search: '?activity=dyslexia-pronunciation-buddy',
      expectedPathname: ROUTES.PRONUNCIATION_BUDDY,
      neuroTypes: ['dyslexia'],
      completion: 'pronunciation-attempt',
    })?.neuroId).toBe('dyslexia');
  });
});
