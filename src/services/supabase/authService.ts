import { AuthError, type Session, type User } from '@supabase/supabase-js';
import { ROUTES } from 'constants/routes';
import type { Profile, UserGender, UserSex } from './client';
import { getSupabaseClient, type UserRole } from './client';
import { resolveAuthSession } from './sessionUtils';

export interface SignupDetails {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  childName?: string;
  sex: UserSex;
  gender: UserGender;
  age?: number;
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
    sex: details.sex,
    gender: details.gender,
    age: details.age ?? null,
  };
}

/**
 * Sends an email OTP via signInWithOtp.
 * Hosted Supabase uses the **Confirm signup** template for brand-new emails
 * and **Magic Link** for existing users — both must include {{ .Token }} only.
 * See supabase/email-templates/README.md
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

async function tryVerifyOtp(
  email: string,
  token: string,
  type: 'email' | 'signup' | 'recovery',
) {
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
  return resolveAuthSession(getSupabaseClient(), data);
}

export function getRoleFromUser(user: User): UserRole {
  const role = user.user_metadata?.role;
  if (role === 'child' || role === 'parent' || role === 'teacher' || role === 'admin') {
    return role;
  }
  return 'parent';
}

export function isAdminProfile(profile: Profile | null | undefined): boolean {
  return profile?.role === 'admin' && profile?.is_authorized !== false;
}

export function getRouteForProfile(profile: Profile): string {
  if (profile.role === 'admin') {
    if (profile.is_authorized === false || profile.status === 'suspended') {
      return ROUTES.ADMIN_LOGIN;
    }
    return ROUTES.ADMIN_DASHBOARD;
  }

  switch (profile.role) {
    case 'child':
      return profile.onboarding_completed && profile.neuro_types.length > 0
        ? ROUTES.CHILD_DASHBOARD
        : ROUTES.NEURO_SELECTOR;
    case 'parent':
      return ROUTES.PARENT_HUB;
    case 'teacher':
      return ROUTES.TEACHER_DASHBOARD;
    default:
      return ROUTES.LOGIN;
  }
}

export function getRouteForUser(user: User, profile?: Profile | null): string {
  if (profile) return getRouteForProfile(profile);
  if (getRoleFromUser(user) === 'child') return ROUTES.NEURO_SELECTOR;
  return getPostSignupRoute(getRoleFromUser(user));
}

export function buildFallbackProfileFromUser(user: User): Profile {
  const meta = user.user_metadata ?? {};
  const firstName = String(meta.first_name ?? '');
  const lastName = String(meta.last_name ?? '');
  const now = new Date().toISOString();

  return {
    id: user.id,
    email: user.email ?? '',
    role: getRoleFromUser(user),
    first_name: firstName,
    last_name: lastName,
    full_name: String(meta.full_name ?? `${firstName} ${lastName}`.trim()),
    child_name: meta.child_name ? String(meta.child_name) : null,
    sex: meta.sex ? (String(meta.sex) as Profile['sex']) : null,
    gender: meta.gender ? (String(meta.gender) as Profile['gender']) : null,
    bio: null,
    age: null,
    neuro_types: [],
    onboarding_completed: false,
    email_verified_at: now,
    created_at: now,
    updated_at: now,
  };
}

export async function verifySignupOtp(email: string, token: string) {
  const trimmedEmail = email.trim();
  const trimmedToken = token.trim();

  // New signups on hosted Supabase use Confirm signup template → type 'signup'
  let data = await tryVerifyOtp(trimmedEmail, trimmedToken, 'signup');
  if (!data) {
    data = await tryVerifyOtp(trimmedEmail, trimmedToken, 'email');
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

/**
 * Sends a password-reset OTP via resetPasswordForEmail.
 * Uses the **Reset password** email template — must include {{ .Token }} only.
 * Paste supabase/email-templates/reset-password-otp.html in the Supabase dashboard.
 */
export async function requestPasswordResetOtp(email: string): Promise<void> {
  const trimmedEmail = email.trim();
  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(trimmedEmail, {
    redirectTo: `${window.location.origin}${ROUTES.FORGOT_PASSWORD}`,
  });
  if (error) throw error;
}

export async function verifyPasswordResetOtp(email: string, token: string) {
  const trimmedEmail = email.trim();
  const trimmedToken = token.trim();

  const data = await tryVerifyOtp(trimmedEmail, trimmedToken, 'recovery');
  if (!data) {
    throw new Error('Invalid or expired code. Please try again.');
  }

  return persistVerifiedAuth(data);
}

export async function resendPasswordResetOtp(email: string): Promise<void> {
  await requestPasswordResetOtp(email);
}

export async function updatePasswordAfterReset(password: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.updateUser({ password });
  if (error) throw error;
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
  sex?: UserSex | null;
  gender?: UserGender | null;
  age?: number | null;
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
    sex: payload.sex ?? null,
    gender: payload.gender ?? null,
    age: payload.age ?? null,
    neuro_types: [],
    onboarding_completed: false,
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
    sex: details.sex,
    gender: details.gender,
    age: details.age ?? null,
    neuro_types: [],
    onboarding_completed: false,
    email_verified_at: now,
    created_at: now,
    updated_at: now,
  };
}

export function getPostSignupRoute(role: UserRole): string {
  switch (role) {
    case 'child':
      return ROUTES.NEURO_SELECTOR;
    case 'parent':
      return ROUTES.PARENT_HUB;
    case 'teacher':
      return ROUTES.TEACHER_DASHBOARD;
    case 'admin':
      return ROUTES.ADMIN_DASHBOARD;
    default:
      return ROUTES.LOGIN;
  }
}
