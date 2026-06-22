import type { AutismProfile } from 'features/child/types/autismProfile';
import type { CompanionContext } from 'features/child/types/companionOnboarding';

export function buildCompanionContext(
  profile: AutismProfile | null | undefined,
  childName: string,
  age: number | null,
): CompanionContext {
  return {
    childName: profile?.aboutMe?.preferredName || childName,
    age,
    interests: profile?.learning?.interests ?? [],
    learningFormats: profile?.learning?.bestFormats ?? [],
    communicationDifficulties: profile?.communication?.difficulties ?? [],
    sensorySensitivities: profile?.sensory?.sensitivities ?? [],
    goals: profile?.goals?.selected ?? [],
    calmStrategies: profile?.emotional?.calmStrategies ?? profile?.sensory?.calmingTools ?? [],
    worryTopics: profile?.emotional?.worryTopics ?? '',
    frustrationTriggers: profile?.emotional?.frustrationTriggers ?? '',
  };
}

export function companionContextPrompt(ctx: CompanionContext): string {
  const ageLine = ctx.age ? `Age: ${ctx.age}.` : '';
  const interests = ctx.interests.length ? `Interests: ${ctx.interests.join(', ')}.` : '';
  const learning = ctx.learningFormats.length
    ? `Learns best with: ${ctx.learningFormats.join(', ')}.`
    : '';
  const sensory = ctx.sensorySensitivities.length
    ? `Sensory sensitivities: ${ctx.sensorySensitivities.join(', ')}.`
    : '';
  const goals = ctx.goals.length ? `Goals: ${ctx.goals.join(', ')}.` : '';
  const worries = ctx.worryTopics ? `Often worried about: ${ctx.worryTopics}.` : '';
  const frustrations = ctx.frustrationTriggers
    ? `Gets frustrated when: ${ctx.frustrationTriggers}.`
    : '';

  return [
    `Child name: ${ctx.childName}.`,
    ageLine,
    interests,
    learning,
    sensory,
    goals,
    worries,
    frustrations,
    'Use warm, simple, supportive language. Never diagnose. Never give medical advice.',
    'AdaptBuddy is a trusted companion, not a therapist.',
  ]
    .filter(Boolean)
    .join(' ');
}

export function ageAwareTone(age: number | null): string {
  if (age == null) return 'Use clear, friendly language suitable for a child or teenager.';
  if (age <= 7) return 'Use very simple words, short sentences, and a gentle playful tone for a young child (ages 4–7).';
  if (age <= 11) return 'Use simple, encouraging language for a child aged 8–11.';
  if (age <= 14) return 'Use friendly, respectful language for a young teenager.';
  return 'Use warm, respectful language for a teenager aged 15–17.';
}
