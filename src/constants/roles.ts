import type { Profile, UserRole } from 'services/supabase/client';

/** Guided child learners (school-age). */
export const CHILD_MIN_AGE = 4;
export const CHILD_MAX_AGE = 17;

/** Self-directed adult / young-adult learners. */
export const ADULT_LEARNER_MIN_AGE = 18;
export const ADULT_LEARNER_MAX_AGE = 99;

export function isLearnerRole(role?: UserRole | string | null): boolean {
  return role === 'child' || role === 'adult';
}

export function isAdultLearnerRole(role?: UserRole | string | null): boolean {
  return role === 'adult';
}

export function isSupervisingRole(role?: UserRole | string | null): boolean {
  return role === 'parent' || role === 'teacher' || role === 'admin';
}

export function isValidChildAge(age: number): boolean {
  return Number.isInteger(age) && age >= CHILD_MIN_AGE && age <= CHILD_MAX_AGE;
}

export function isValidAdultLearnerAge(age: number): boolean {
  return Number.isInteger(age) && age >= ADULT_LEARNER_MIN_AGE && age <= ADULT_LEARNER_MAX_AGE;
}

export function isValidLearnerAgeForRole(role: UserRole, age: number): boolean {
  if (role === 'adult') return isValidAdultLearnerAge(age);
  if (role === 'child') return isValidChildAge(age);
  return true;
}

export function parseLearnerAge(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const age = Number(trimmed);
  if (!Number.isFinite(age)) return null;
  return Math.floor(age);
}

/** @deprecated Prefer parseLearnerAge — kept for existing imports. */
export function parseChildAge(value: string): number | null {
  return parseLearnerAge(value);
}

/**
 * When someone enters an age on the child form that belongs in the adult lane,
 * suggest switching — used for a smooth signup transition.
 */
export function shouldSuggestAdultLane(age: number | null): boolean {
  return age !== null && age >= ADULT_LEARNER_MIN_AGE;
}

export function learnerDisplayLabel(role?: UserRole | string | null): string {
  if (role === 'adult') return 'Adult learner';
  if (role === 'child') return 'Child';
  return 'Learner';
}

export function preferredLearnerName(profile: Profile | null | undefined): string {
  if (!profile) return 'friend';
  return profile.first_name?.trim() || profile.full_name?.trim() || 'friend';
}
