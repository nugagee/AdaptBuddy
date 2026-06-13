import type { UserSex } from 'services/supabase/client';

/**
 * UK ONS / NHS-aligned sex (biological/legal — distinct from gender identity).
 */
export const UK_SEX_OPTIONS: { value: UserSex; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'intersex', label: 'Intersex or variation in sex characteristics' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export const UK_SEX_FIELD_LABEL = 'Sex';
export const UK_SEX_FIELD_HINT =
  'Sex recorded at birth or on legal documents (UK ONS / NHS categories). Separate from gender identity.';

export function formatUkSex(value: string | null | undefined): string {
  if (!value) return '—';
  const match = UK_SEX_OPTIONS.find((o) => o.value === value);
  if (match) return match.label;
  return value.replace(/_/g, ' ');
}
