import type { UserGender, UserSex } from 'services/supabase/client';

export { UK_GENDER_OPTIONS, UK_GENDER_FIELD_LABEL, UK_GENDER_FIELD_HINT, formatUkGender } from './ukGender';
export { UK_SEX_OPTIONS, UK_SEX_FIELD_LABEL, UK_SEX_FIELD_HINT, formatUkSex } from './ukSex';

export {
  CHILD_MIN_AGE,
  CHILD_MAX_AGE,
  ADULT_LEARNER_MIN_AGE,
  ADULT_LEARNER_MAX_AGE,
  isValidChildAge,
  isValidAdultLearnerAge,
  isValidLearnerAgeForRole,
  parseChildAge,
  parseLearnerAge,
  shouldSuggestAdultLane,
  isLearnerRole,
  isAdultLearnerRole,
  learnerDisplayLabel,
} from './roles';
