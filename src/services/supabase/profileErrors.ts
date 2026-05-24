interface SupabaseLikeError {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

/** Turns Supabase/PostgREST errors into child-friendly messages. */
export function toProfileErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Could not save your selections. Please try again.';
  }

  const err = error as SupabaseLikeError;
  const message = err.message ?? '';

  if (
    message.includes('neuro_types') ||
    message.includes('onboarding_completed') ||
    message.includes('schema cache')
  ) {
    return 'Profile setup is not complete on the server yet. Please run migration 002_profile_neuro_onboarding.sql in your Supabase SQL Editor, then try again.';
  }

  if (err.code === 'PGRST116' || message.includes('0 rows')) {
    return 'We could not find your profile yet. Please sign out, sign in again, and retry.';
  }

  if (message.includes('JWT') || message.includes('not authenticated')) {
    return 'Your session expired. Please sign in again.';
  }

  return message || 'Could not save your selections. Please try again.';
}
