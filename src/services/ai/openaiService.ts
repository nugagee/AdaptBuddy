const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY?.trim();
const OPENAI_MODEL = process.env.REACT_APP_OPENAI_MODEL?.trim() || 'gpt-4o-mini';

export const isOpenAiConfigured = Boolean(OPENAI_API_KEY);

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chatCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error(
      'OpenAI is not configured. Add REACT_APP_OPENAI_API_KEY to your .env file.',
    );
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature: options?.temperature ?? 0.6,
      max_tokens: options?.maxTokens ?? 900,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('OpenAI returned an empty response.');
  return content;
}

export function parseJsonBlock<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : text.trim();
  return JSON.parse(raw) as T;
}
