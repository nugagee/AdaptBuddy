/** Maps auth/network errors to user-friendly signup/login messages. */
export function toAuthErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;

  const message = 'message' in error ? String((error as { message?: string }).message) : '';
  const lower = message.toLowerCase();

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('load failed')
  ) {
    return (
      'Could not reach Supabase. On production, confirm Vercel has the correct ' +
      'REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY, then redeploy. ' +
      'The project URL must match an active Supabase project (check Supabase → Project Settings → API).'
    );
  }

  if (lower.includes('not configured')) return message;

  return message || fallback;
}
