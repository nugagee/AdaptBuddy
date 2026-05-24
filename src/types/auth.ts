import type { User } from '@supabase/supabase-js';

/** Serializable auth session stored in Zustand after sign-in / OTP verify */
export interface AuthSessionState {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at?: number;
  refresh_token: string;
  user: User;
}
