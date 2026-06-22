import type {
  CompanionContext,
  GeneratedSocialStory,
  MoodCheckInResult,
  SimplifiedLanguageResult,
} from 'features/child/types/companionOnboarding';
import { ageAwareTone, companionContextPrompt } from './companionContext';
import { chatCompletion, isOpenAiConfigured, parseJsonBlock } from './openaiService';

const BASE_SYSTEM = `You are AdaptBuddy, a warm AI companion for neurodiverse children aged 4–17.
You are supportive, never clinical, never diagnostic, and never give medical advice.
You help children feel understood throughout their day.`;

function fallbackSimplify(text: string): SimplifiedLanguageResult {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));

  return {
    original: text,
    simplified: sentences.length ? sentences : [text],
    tip: 'Add REACT_APP_OPENAI_API_KEY for smarter simplification.',
  };
}

function fallbackStory(scenario: string, ctx: CompanionContext): GeneratedSocialStory {
  const name = ctx.childName;
  return {
    title: scenario.trim() || 'My social story',
    panels: [
      `Sometimes ${name} goes to new places.`,
      `${name} can look for a trusted adult if unsure.`,
      `${name} can take deep breaths and go one step at a time.`,
      `${name} is doing their best, and that is enough.`,
    ],
  };
}

function fallbackMood(mood: string, note: string, ctx: CompanionContext): MoodCheckInResult {
  return {
    response: `Thank you for sharing, ${ctx.childName}. Feeling ${mood} is okay. I'm here with you.`,
    suggestion: note.trim()
      ? 'Would you like to try a calm break or talk to a trusted adult?'
      : 'You can tell me more whenever you are ready.',
  };
}

export async function simplifyLanguage(
  text: string,
  ctx: CompanionContext,
): Promise<SimplifiedLanguageResult> {
  if (!text.trim()) throw new Error('Please enter some text to simplify.');
  if (!isOpenAiConfigured) return fallbackSimplify(text);

  const system = `${BASE_SYSTEM}
${ageAwareTone(ctx.age)}
${companionContextPrompt(ctx)}
Return JSON only: { "simplified": string[], "tip": string }
Each item in simplified should be one short, clear step. Use the child's interests when helpful.`;

  const raw = await chatCompletion(system, `Simplify this instruction for the child:\n"${text.trim()}"`);
  try {
    const parsed = parseJsonBlock<{ simplified: string[]; tip?: string }>(raw);
    return {
      original: text,
      simplified: parsed.simplified?.length ? parsed.simplified : [raw],
      tip: parsed.tip,
    };
  } catch {
    return {
      original: text,
      simplified: raw.split('\n').filter(Boolean).slice(0, 5),
    };
  }
}

export async function generateSocialStory(
  scenario: string,
  ctx: CompanionContext,
): Promise<GeneratedSocialStory> {
  if (!scenario.trim()) throw new Error('Describe the situation for your story.');
  if (!isOpenAiConfigured) return fallbackStory(scenario, ctx);

  const system = `${BASE_SYSTEM}
${ageAwareTone(ctx.age)}
${companionContextPrompt(ctx)}
Write a personalized social story with 4–6 short panels.
Use the child's name. Be reassuring and practical.
Return JSON only: { "title": string, "panels": string[] }`;

  const raw = await chatCompletion(
    system,
    `Create a social story for this situation: ${scenario.trim()}`,
    { temperature: 0.7 },
  );

  try {
    return parseJsonBlock<GeneratedSocialStory>(raw);
  } catch {
    return fallbackStory(scenario, ctx);
  }
}

export async function respondToMoodCheckIn(
  mood: string,
  note: string,
  ctx: CompanionContext,
): Promise<MoodCheckInResult> {
  if (!mood) throw new Error('Please choose how you are feeling.');
  if (!isOpenAiConfigured) return fallbackMood(mood, note, ctx);

  const system = `${BASE_SYSTEM}
${ageAwareTone(ctx.age)}
${companionContextPrompt(ctx)}
The child selected mood: ${mood}.
Respond with empathy in 2–3 short sentences. Offer one gentle suggestion if appropriate.
Return JSON only: { "response": string, "suggestion": string }`;

  const user = note.trim()
    ? `Mood: ${mood}. They wrote: "${note.trim()}"`
    : `Mood: ${mood}. No extra note.`;

  const raw = await chatCompletion(system, user, { temperature: 0.7, maxTokens: 400 });

  try {
    return parseJsonBlock<MoodCheckInResult>(raw);
  } catch {
    return { response: raw, suggestion: 'Would a calm break help right now?' };
  }
}

export { isOpenAiConfigured };
