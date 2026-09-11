import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { useAutismProfileStore } from 'features/child/store/autismProfileStore';

/** Test-only synthetic account. Exercise the real owner checks; never mock them open. */
export const prepareReadyChildScope = (childId = 'child-a', neuroTypes: string[] = []) => {
  const createdAt = '2026-09-01T09:00:00.000Z';
  useAuthStore.setState({
    user: { id: childId, aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: createdAt },
    profile: {
      id: childId, email: 'child@example.invalid', role: 'child',
      first_name: 'Test', last_name: 'Child', full_name: 'Test Child', age: 10,
      neuro_types: neuroTypes, onboarding_completed: true,
      created_at: createdAt, updated_at: createdAt,
    },
    session: null, isGuest: false, loading: false, initialized: true,
  });
  useChildProgressStore.getState().resetForChild(childId);
  useChildProgressStore.getState().markReady(childId);
  useAutismProfileStore.getState().resetForChild(childId);
  useAutismProfileStore.getState().markReady(childId);
};

export const clearReadyChildScope = () => {
  useChildProgressStore.getState().resetForChild(null);
  useAutismProfileStore.getState().resetForChild(null);
  useAuthStore.setState({ user: null, profile: null, session: null, isGuest: false });
};
