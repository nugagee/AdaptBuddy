import type {
  BuddyChatMessage,
  CompanionContext,
  GeneratedSocialStory,
  MoodCheckInResult,
  SimplifiedLanguageResult,
} from 'features/child/types/companionOnboarding';
import { buddyRequest, isOpenAiConfigured, parseJsonBlock } from './openaiService';

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
    tip: 'Buddy used a simple offline version because the AI service is not connected.',
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

  const raw = (await buddyRequest('simplify', text.trim(), ctx)).content;
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

  const raw = (await buddyRequest('story', scenario.trim(), ctx)).content;

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

  const user = note.trim()
    ? `Mood: ${mood}. They wrote: "${note.trim()}"`
    : `Mood: ${mood}. No extra note.`;

  const result = await buddyRequest('mood', user, ctx);
  const raw = result.content;

  try {
    return {
      ...parseJsonBlock<MoodCheckInResult>(raw),
      riskLevel: result.riskLevel,
      adultActionRequired: result.adultActionRequired,
    };
  } catch {
    return {
      response: raw,
      suggestion: 'Would a calm break or a trusted adult help right now?',
      riskLevel: result.riskLevel,
      adultActionRequired: result.adultActionRequired,
    };
  }
}

export async function sendBuddyMessage(
  message: string,
  ctx: CompanionContext,
  history: BuddyChatMessage[],
) {
  if (!message.trim()) throw new Error('Type or choose something to tell Buddy.');
  return buddyRequest('conversation', message.trim(), ctx, history);
}

export { isOpenAiConfigured };
