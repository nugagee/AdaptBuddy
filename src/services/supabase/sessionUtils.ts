import type { Session } from '@supabase/supabase-js';
import type { AuthSessionState } from 'types/auth';

export function toAuthSessionState(session: Session): AuthSessionState {
  return {
    access_token: session.access_token,
    token_type: session.token_type,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    refresh_token: session.refresh_token,
    user: session.user,
  };
}
