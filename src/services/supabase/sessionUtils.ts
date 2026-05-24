import type { Session, User } from '@supabase/supabase-js';
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

/** Persists tokens on the Supabase client and returns the active session + user. */
export async function resolveAuthSession(
  client: {
    auth: {
      setSession: (tokens: {
        access_token: string;
        refresh_token: string;
      }) => Promise<{ data: { session: Session | null }; error: unknown }>;
      getSession: () => Promise<{ data: { session: Session | null } }>;
    };
  },
  data: { session: Session | null; user: User | null },
): Promise<{ session: Session | null; user: User | null }> {
  if (data.session?.access_token && data.session.refresh_token) {
    await client.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  }

  const { data: sessionData } = await client.auth.getSession();
  const session = sessionData.session ?? data.session;
  const user = session?.user ?? data.user;

  return { session, user };
}
