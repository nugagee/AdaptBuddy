import type { UserGender } from 'services/supabase/client';

/**
 * UK NHS-aligned gender identity (distinct from sex at birth).
 * @see https://www.nhs.uk/nhs-services/equality-and-diversity/gender-identity/
 */
export const UK_GENDER_OPTIONS: { value: UserGender; label: string }[] = [
  { value: 'woman', label: 'Woman / Girl' },
  { value: 'man', label: 'Man / Boy' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'other', label: 'Other gender identity' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export const UK_GENDER_FIELD_LABEL = 'Gender identity';
export const UK_GENDER_FIELD_HINT =
  'How you identify. This is separate from sex and is collected using UK NHS gender identity categories.';

export function formatUkGender(value: string | null | undefined): string {
  if (!value) return '—';
  const match = UK_GENDER_OPTIONS.find((o) => o.value === value);
  if (match) return match.label;
  // Legacy values from before sex/gender split
  if (value === 'male') return 'Man / Boy';
  if (value === 'female') return 'Woman / Girl';
  return value.replace(/_/g, ' ');
}
