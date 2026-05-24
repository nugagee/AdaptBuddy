import { AuthError, type Session, type User } from '@supabase/supabase-js';
import type { Profile } from './client';
import { getSupabaseClient, type UserRole } from './client';

export interface SignupDetails {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  childName?: string;
  role: UserRole;
}

export interface SignupOtpResult {
  needsOtpVerification: boolean;
  userId: string | null;
}

function buildFullName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

function buildSignupMetadata(details: SignupDetails) {
  const firstName = details.firstName.trim();
  const lastName = details.lastName.trim();
  const fullName = buildFullName(firstName, lastName);
  const childName = details.childName?.trim() || null;

  return {
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    role: details.role,
    child_name: childName,
  };
}

/**
 * Sends an email OTP via signInWithOtp (uses the Magic Link email template).
 * Supabase currently sends 8-digit codes. Template must include {{ .Token }} only.
 */
export async function requestSignupOtp(details: SignupDetails): Promise<SignupOtpResult> {
  const email = details.email.trim();
  const metadata = buildSignupMetadata(details);
  const client = getSupabaseClient();

  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: metadata,
    },
  });

  if (error) {
    // User may already exist from a previous signUp attempt — resend signup OTP instead
    if (isExistingUserError(error)) {
      const { error: resendError } = await client.auth.resend({ type: 'signup', email });
      if (resendError) throw resendError;
      return { needsOtpVerification: true, userId: null };
    }
    throw error;
  }

  return { needsOtpVerification: true, userId: null };
}

function isExistingUserError(error: AuthError): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('already registered') ||
    message.includes('already exists') ||
    message.includes('user already')
  );
}

async function tryVerifyOtp(email: string, token: string, type: 'email' | 'signup') {
  const { data, error } = await getSupabaseClient().auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type,
  });

  if (error) return null;
  return data;
}

/** Ensures the Supabase client persists tokens returned from verify. */
async function persistVerifiedAuth(data: {
  session: Session | null;
  user: User | null;
}): Promise<{ session: Session | null; user: User | null }> {
  const client = getSupabaseClient();

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

export async function verifySignupOtp(email: string, token: string) {
  const trimmedEmail = email.trim();
  const trimmedToken = token.trim();

  // signInWithOtp → type 'email'; legacy signUp → type 'signup'
  let data = await tryVerifyOtp(trimmedEmail, trimmedToken, 'email');
  if (!data) {
    data = await tryVerifyOtp(trimmedEmail, trimmedToken, 'signup');
  }

  if (!data) {
    throw new Error('Invalid or expired code. Please try again.');
  }

  return persistVerifiedAuth(data);
}

/** Set password after OTP signup — run after navigation so it cannot block routing. */
export async function setSignupPassword(password: string) {
  if (!password) return;
  const { error } = await getSupabaseClient().auth.updateUser({ password });
  if (error) {
    console.warn('Password update after signup failed:', error.message);
  }
}

export async function resendSignupOtp(email: string) {
  const trimmedEmail = email.trim();
  const client = getSupabaseClient();

  const { error: otpError } = await client.auth.signInWithOtp({
    email: trimmedEmail,
    options: { shouldCreateUser: false },
  });

  if (!otpError) return;

  const { error: resendError } = await client.auth.resend({
    type: 'signup',
    email: trimmedEmail,
  });

  if (resendError) throw resendError;
}

export interface ProfileUpsertPayload {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  childName?: string;
  emailVerified?: boolean;
}

/** Saves or updates the user profile row after OTP verification. */
export async function upsertUserProfile(payload: ProfileUpsertPayload) {
  const firstName = payload.firstName.trim();
  const lastName = payload.lastName.trim();
  const fullName = buildFullName(firstName, lastName);
  const childName = payload.childName?.trim() || null;

  const row = {
    id: payload.id,
    email: payload.email.trim(),
    role: payload.role,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    child_name: childName,
    email_verified_at: payload.emailVerified ? new Date().toISOString() : null,
  };

  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Builds a local profile when the DB upsert fails (e.g. table not migrated yet). */
export function buildFallbackProfile(details: SignupDetails, userId: string): Profile {
  const firstName = details.firstName.trim();
  const lastName = details.lastName.trim();
  const now = new Date().toISOString();

  return {
    id: userId,
    email: details.email.trim(),
    role: details.role,
    first_name: firstName,
    last_name: lastName,
    full_name: buildFullName(firstName, lastName),
    child_name: details.childName?.trim() || null,
    email_verified_at: now,
    created_at: now,
    updated_at: now,
  };
}

export function getPostSignupRoute(role: UserRole): string {
  switch (role) {
    case 'child':
      return '/dashboard';
    case 'parent':
      return '/parent-hub';
    case 'teacher':
      return '/teacher/dashboard';
    default:
      return '/login';
  }
}
