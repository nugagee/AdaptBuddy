import {
  isChildProgressReadable,
  resolveAuthenticatedChildId,
  resolveChildScopeId,
} from './childProgressReadAccess';

describe('child progress read access', () => {
  it('accepts only a verified, non-guest child profile matching the auth user', () => {
    expect(resolveAuthenticatedChildId({
      userId: 'child-a',
      profileId: 'child-a',
      profileRole: 'child',
      isGuest: false,
    })).toBe('child-a');

    expect(resolveAuthenticatedChildId({
      userId: 'child-a',
      profileId: 'child-b',
      profileRole: 'child',
      isGuest: false,
    })).toBeNull();
    expect(resolveAuthenticatedChildId({
      userId: 'child-a',
      profileId: 'child-a',
      profileRole: 'parent',
      isGuest: false,
    })).toBeNull();
    expect(resolveAuthenticatedChildId({
      userId: 'child-a',
      profileId: 'child-a',
      profileRole: 'child',
      isGuest: true,
    })).toBeNull();
  });

  it('uses only the fixed transient child scope for child guest mode', () => {
    expect(resolveChildScopeId({
      userId: null,
      profileId: 'guest-child',
      profileRole: 'child',
      isGuest: true,
    })).toBe('guest-child');
    expect(resolveChildScopeId({
      userId: null,
      profileId: 'guest-parent',
      profileRole: 'parent',
      isGuest: true,
    })).toBeNull();
    expect(resolveChildScopeId({
      userId: null,
      profileId: 'unexpected-guest-id',
      profileRole: 'child',
      isGuest: true,
    })).toBeNull();
  });

  it('keeps progress hidden until the matching child scope is ready', () => {
    expect(isChildProgressReadable('child-a', 'child-a', 'ready')).toBe(true);
    expect(isChildProgressReadable('child-a', 'child-b', 'ready')).toBe(false);
    expect(isChildProgressReadable('child-a', 'child-a', 'loading')).toBe(false);
    expect(isChildProgressReadable('child-a', 'child-a', 'error')).toBe(false);
    expect(isChildProgressReadable(null, 'child-a', 'ready')).toBe(false);
  });
});
