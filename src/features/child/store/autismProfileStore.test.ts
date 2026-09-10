import {
  beginAutismProfileScope,
  getAutismProfileStorageKey,
  hydrateAutismProfileScope,
  selectAutismProfileForChild,
  shouldApplyRemoteAutismProfile,
  unbindAutismProfileScope,
  updateAutismProfileForChild,
  useAutismProfileStore,
} from './autismProfileStore';

describe('autismProfileStore account isolation', () => {
  beforeEach(() => {
    unbindAutismProfileScope();
    window.localStorage.clear();
  });

  afterEach(() => {
    unbindAutismProfileScope();
    jest.restoreAllMocks();
  });

  const openChild = async (childId: string) => {
    const token = beginAutismProfileScope(childId);
    expect(selectAutismProfileForChild(useAutismProfileStore.getState(), childId)).toBeNull();
    expect(await hydrateAutismProfileScope(token)).toBe('ready');
  };

  it('restores only the neurodiversity profile owned by the active child', async () => {
    await openChild('child-a');
    const childAProfile = useAutismProfileStore.getState().profile;
    useAutismProfileStore.getState().updateProfile({
      ...childAProfile,
      sensory: { ...childAProfile.sensory, customNotes: 'Child A needs a quiet room.' },
    });

    await openChild('child-b');
    expect(useAutismProfileStore.getState().profile.sensory.customNotes).toBe('');
    const childBProfile = useAutismProfileStore.getState().profile;
    useAutismProfileStore.getState().updateProfile({
      ...childBProfile,
      sensory: { ...childBProfile.sensory, customNotes: 'Child B prefers headphones.' },
    });

    await openChild('child-a');
    expect(useAutismProfileStore.getState().profile.sensory.customNotes).toBe(
      'Child A needs a quiet room.',
    );

    await openChild('child-b');
    expect(useAutismProfileStore.getState().profile.sensory.customNotes).toBe(
      'Child B prefers headphones.',
    );
  });

  it('ignores the legacy global profile because its owner cannot be proven', async () => {
    window.localStorage.setItem(
      'adaptbuddy-autism-profile',
      JSON.stringify({ state: { ownerId: 'child-a' }, version: 0 }),
    );

    await openChild('child-b');

    expect(useAutismProfileStore.getState().profile.sensory.customNotes).toBe('');
    expect(window.localStorage.getItem('adaptbuddy-autism-profile')).not.toBeNull();
  });

  it('rejects targeted state when its nested profile belongs to another child', async () => {
    await openChild('child-a');
    const childAProfile = useAutismProfileStore.getState().profile;
    useAutismProfileStore.getState().updateProfile({
      ...childAProfile,
      sensory: { ...childAProfile.sensory, customNotes: 'Child A private note.' },
    });
    const childARaw = window.localStorage.getItem(getAutismProfileStorageKey('child-a'))!;
    const mismatched = JSON.parse(childARaw);
    mismatched.state.ownerId = 'child-b';
    window.localStorage.setItem(getAutismProfileStorageKey('child-b'), JSON.stringify(mismatched));

    const token = beginAutismProfileScope('child-b');
    expect(await hydrateAutismProfileScope(token)).toBe('error');

    expect(useAutismProfileStore.getState()).toEqual(
      expect.objectContaining({
        ownerId: 'child-b',
        hydrationStatus: 'error',
        profile: expect.objectContaining({ childId: 'child-b' }),
      }),
    );
    expect(useAutismProfileStore.getState().profile.sensory.customNotes).toBe('');
    expect(window.localStorage.getItem(getAutismProfileStorageKey('child-b'))).toContain(
      'Child A private note.',
    );
  });

  it('preserves corrupt scoped data and fails closed', async () => {
    const storageKey = getAutismProfileStorageKey('child-a');
    window.localStorage.setItem(storageKey, '{not valid JSON');
    const token = beginAutismProfileScope('child-a');

    expect(await hydrateAutismProfileScope(token)).toBe('error');
    expect(useAutismProfileStore.getState().hydrationStatus).toBe('error');
    expect(selectAutismProfileForChild(useAutismProfileStore.getState(), 'child-a')).toBeNull();
    expect(window.localStorage.getItem(storageKey)).toBe('{not valid JSON');
  });

  it('fails closed when browser storage cannot be read', async () => {
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage is unavailable', 'SecurityError');
    });
    const token = beginAutismProfileScope('child-a');

    expect(await hydrateAutismProfileScope(token)).toBe('error');
    expect(useAutismProfileStore.getState().hydrationStatus).toBe('error');

    getItem.mockRestore();
  });

  it('rejects stale hydrations, including an A to B to A switch', async () => {
    const firstChildAToken = beginAutismProfileScope('child-a');
    beginAutismProfileScope('child-b');
    const latestChildAToken = beginAutismProfileScope('child-a');

    expect(await hydrateAutismProfileScope(firstChildAToken)).toBe('stale');
    expect(useAutismProfileStore.getState().hydrationStatus).toBe('loading');
    expect(await hydrateAutismProfileScope(latestChildAToken)).toBe('ready');
    expect(useAutismProfileStore.getState()).toEqual(
      expect.objectContaining({ ownerId: 'child-a', hydrationStatus: 'ready' }),
    );
  });

  it('only applies a fetched profile to its ready owner scope', async () => {
    const childAToken = beginAutismProfileScope('child-a');
    const profile = useAutismProfileStore.getState().profile;

    expect(updateAutismProfileForChild('child-a', profile)).toBe(false);
    expect(await hydrateAutismProfileScope(childAToken)).toBe('ready');
    expect(updateAutismProfileForChild('child-b', profile)).toBe(false);
    expect(updateAutismProfileForChild('child-a', profile)).toBe(true);
    expect(useAutismProfileStore.getState().profile.childId).toBe('child-a');
  });

  it('does not let a stale same-child fetch overwrite a newer local edit', async () => {
    const childAToken = beginAutismProfileScope('child-a');
    expect(await hydrateAutismProfileScope(childAToken)).toBe('ready');

    const profileBeforeFetch = useAutismProfileStore.getState().profile;
    const staleRemoteProfile = {
      ...profileBeforeFetch,
      sensory: {
        ...profileBeforeFetch.sensory,
        customNotes: 'Older server note.',
      },
    };

    useAutismProfileStore.getState().updateProfile({
      ...profileBeforeFetch,
      sensory: {
        ...profileBeforeFetch.sensory,
        customNotes: 'New local note.',
      },
    });

    expect(
      updateAutismProfileForChild('child-a', staleRemoteProfile, profileBeforeFetch),
    ).toBe(false);
    expect(useAutismProfileStore.getState().profile.sensory.customNotes).toBe(
      'New local note.',
    );
  });

  it('keeps a completed local passport when the server copy is older', () => {
    beginAutismProfileScope('child-a');
    const base = useAutismProfileStore.getState().profile;
    const local = {
      ...base,
      completedAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-03T00:00:00.000Z',
    };

    expect(shouldApplyRemoteAutismProfile(local, {
      ...local,
      updatedAt: '2026-01-01T00:00:00.000Z',
    })).toBe(false);
    expect(shouldApplyRemoteAutismProfile(local, {
      ...local,
      updatedAt: '2026-01-04T00:00:00.000Z',
    })).toBe(true);
  });

  it('accepts a server passport over an untouched local default', () => {
    beginAutismProfileScope('child-a');
    const localDefault = useAutismProfileStore.getState().profile;
    expect(shouldApplyRemoteAutismProfile(localDefault, {
      ...localDefault,
      updatedAt: '2020-01-01T00:00:00.000Z',
    })).toBe(true);
  });
});
