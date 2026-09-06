import type {
  BuddyChatMessage,
  BuddyResponse,
  CompanionContext,
} from 'features/child/types/companionOnboarding';

export type BuddyMode = 'conversation' | 'simplify' | 'story' | 'mood';

export const isOpenAiConfigured = process.env.REACT_APP_BUDDY_API_DISABLED !== 'true';

export async function buddyRequest(
  mode: BuddyMode,
  message: string,
  context: CompanionContext,
  history: BuddyChatMessage[] = [],
): Promise<BuddyResponse> {
  const response = await fetch('/api/buddy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode,
      message,
      context,
      history: history.slice(-6).map(({ role, content }) => ({ role, content })),
    }),
  });

  const data = (await response.json().catch(() => ({}))) as Partial<BuddyResponse> & {
    error?: string;
  };

  if (!response.ok) throw new Error(data.error || 'Buddy could not answer just now.');
  if (!data.content) throw new Error('Buddy returned an empty answer.');

  return {
    content: data.content,
    riskLevel: data.riskLevel ?? 'ordinary',
    adultActionRequired: data.adultActionRequired === true,
  };
}

export function parseJsonBlock<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : text.trim();
  return JSON.parse(raw) as T;
}
