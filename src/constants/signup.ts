import type { UserGender, UserSex } from 'services/supabase/client';

export { UK_GENDER_OPTIONS, UK_GENDER_FIELD_LABEL, UK_GENDER_FIELD_HINT, formatUkGender } from './ukGender';
export { UK_SEX_OPTIONS, UK_SEX_FIELD_LABEL, UK_SEX_FIELD_HINT, formatUkSex } from './ukSex';

export const CHILD_MIN_AGE = 4;
export const CHILD_MAX_AGE = 17;

export function isValidChildAge(age: number): boolean {
  return Number.isInteger(age) && age >= CHILD_MIN_AGE && age <= CHILD_MAX_AGE;
}

export function parseChildAge(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const age = Number(trimmed);
  if (!Number.isFinite(age)) return null;
  return Math.floor(age);
}

export function isValidUserSex(value: string): value is UserSex {
  return (
    value === 'male' ||
    value === 'female' ||
    value === 'intersex' ||
    value === 'prefer_not_to_say'
  );
}

export function isValidUserGender(value: string): value is UserGender {
  return (
    value === 'woman' ||
    value === 'man' ||
    value === 'non_binary' ||
    value === 'other' ||
    value === 'prefer_not_to_say'
  );
}
