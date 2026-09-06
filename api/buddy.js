const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const requestWindows = new Map();

const urgentPatterns = [
  /\b(kill|hurt)\s+(myself|me)\b/i,
  /\b(suicide|end my life|want to die|do not want to live)\b/i,
  /\b(someone|they|he|she)\s+(hurt|hit|touched|touches|abused|abuses)\s+me\b/i,
  /\bnot safe (at home|here|with)\b/i,
  /\bafraid to go home\b/i,
];

const concernPatterns = [
  /\bneed help (from|with) (an adult|someone)\b/i,
  /\bplease (get|tell|contact) (an adult|someone)\b/i,
  /\b(scared|unsafe|bully|bullied|threatened|alone|trapped)\b/i,
  /\b(really sad|cannot cope|can't cope|give up)\b/i,
];

function text(value, max = 1200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function list(value, maxItems = 8) {
  return Array.isArray(value) ? value.map((item) => text(item, 80)).filter(Boolean).slice(0, maxItems) : [];
}

function clientKey(req) {
  return text(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown', 100).split(',')[0];
}

function rateLimited(req) {
  const key = clientKey(req);
  const now = Date.now();
  const current = requestWindows.get(key);
  if (!current || now - current.startedAt > WINDOW_MS) {
    requestWindows.set(key, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS;
}

function riskFor(message) {
  if (urgentPatterns.some((pattern) => pattern.test(message))) return 'urgent';
  if (concernPatterns.some((pattern) => pattern.test(message))) return 'concern';
  return 'ordinary';
}

function safeContext(raw) {
  const age = Number(raw?.age);
  return {
    childName: text(raw?.childName, 40) || 'friend',
    age: Number.isFinite(age) && age >= 4 && age <= 17 ? age : null,
    interests: list(raw?.interests),
    learningFormats: list(raw?.learningFormats),
    communicationDifficulties: list(raw?.communicationDifficulties),
    sensorySensitivities: list(raw?.sensorySensitivities),
    goals: list(raw?.goals),
    calmStrategies: list(raw?.calmStrategies),
  };
}

function taskInstruction(mode) {
  if (mode === 'simplify') {
    return 'Turn the child\'s text into 1–5 short, concrete steps. Return JSON only: {"simplified":["step"],"tip":"optional short tip"}.';
  }
  if (mode === 'story') {
    return 'Create a reassuring, practical social story with 4–6 short panels. Return JSON only: {"title":"title","panels":["panel"]}.';
  }
  if (mode === 'mood') {
    return 'Acknowledge the feeling in one or two short sentences and offer one low-pressure next step. Return JSON only: {"response":"text","suggestion":"text"}.';
  }
  return 'Reply conversationally in no more than three short sentences. Help with communication, understanding, a next step, or asking a trusted adult. Ask at most one question.';
}

function systemInstruction(context, mode) {
  return `You are AdaptBuddy, an AI helper for a neurodivergent child aged 4–17.
Say you are an AI helper when identity or personhood is relevant. Never claim to be human, conscious, a best friend, a therapist, or the only one who understands the child. Never encourage secrecy, dependence, isolation from adults, diagnosis, treatment, punishment, or unsafe action.
Use calm, literal, age-appropriate UK English. Avoid metaphors, guilt, excessive praise, and long replies. Respect a request to stop. Do not ask for a full name, address, school name, contact details, passwords, photographs, or secrets.
If the child may be unsafe, prioritise immediate human help: advise them to go to a trusted adult nearby now. Do not investigate abuse or ask for details. If there is immediate danger, tell them to call 999 or ask a nearby adult to call.
Child context: preferred name ${context.childName}; age ${context.age ?? 'not provided'}; interests ${context.interests.join(', ') || 'not provided'}; helpful formats ${context.learningFormats.join(', ') || 'not provided'}; communication needs ${context.communicationDifficulties.join(', ') || 'not provided'}; sensory needs ${context.sensorySensitivities.join(', ') || 'not provided'}; goals ${context.goals.join(', ') || 'not provided'}; calming strategies ${context.calmStrategies.join(', ') || 'not provided'}.
${taskInstruction(mode)}`;
}

function outputText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text.trim();
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && content?.text) return content.text.trim();
    }
  }
  return '';
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  if (rateLimited(req)) return res.status(429).json({ error: 'Buddy needs a short pause. Please try again in one minute.' });

  const requestOrigin = text(req.headers.origin, 300);
  if (requestOrigin) {
    try {
      if (new URL(requestOrigin).host !== req.headers.host) {
        return res.status(403).json({ error: 'This Buddy request was not allowed.' });
      }
    } catch {
      return res.status(403).json({ error: 'This Buddy request was not allowed.' });
    }
  }

  const mode = ['conversation', 'simplify', 'story', 'mood'].includes(req.body?.mode)
    ? req.body.mode
    : 'conversation';
  const message = text(req.body?.message);
  if (!message) return res.status(400).json({ error: 'Please add a message for Buddy.' });

  const riskLevel = riskFor(message);
  if (riskLevel === 'urgent') {
    return res.status(200).json({
      content: 'I am an AI helper, and this needs a trusted adult now. Please go to a safe adult nearby and show them this message. If you are in immediate danger, call 999 or ask an adult to call.',
      riskLevel,
      adultActionRequired: true,
    });
  }

  if (riskLevel === 'concern') {
    return res.status(200).json({
      content: 'Thank you for telling me. I am an AI helper, so a trusted adult is the right person to help with this. You can use the button below or go to a safe adult nearby.',
      riskLevel,
      adultActionRequired: true,
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Buddy is not connected yet. Please use a quick support button.' });

  const context = safeContext(req.body?.context);
  const history = Array.isArray(req.body?.history)
    ? req.body.history.slice(-6).map((entry) => ({
        role: entry?.role === 'assistant' ? 'assistant' : 'user',
        content: text(entry?.content, 700),
      })).filter((entry) => entry.content)
    : [];

  const input = [
    ...history.map((entry) => ({ role: entry.role, content: entry.content })),
    { role: 'user', content: message },
  ];

  try {
    const moderationResponse = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'omni-moderation-latest', input: message }),
    });
    if (moderationResponse.ok) {
      const moderation = await moderationResponse.json();
      const categories = moderation?.results?.[0]?.categories || {};
      const needsAdult = categories['self-harm'] || categories['self-harm/intent']
        || categories['self-harm/instructions'] || categories['sexual/minors']
        || categories.sexual || categories.violence;
      if (needsAdult) {
        return res.status(200).json({
          content: 'Thank you for telling me. I am an AI helper, and a trusted adult should help with this now. Please use the button below or go to a safe adult nearby. If anyone is in immediate danger, call 999 or ask an adult to call.',
          riskLevel: 'urgent',
          adultActionRequired: true,
        });
      }
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        instructions: systemInstruction(context, mode),
        input,
        max_output_tokens: mode === 'conversation' ? 220 : 500,
        temperature: 0.4,
        store: false,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI response error', response.status);
      return res.status(502).json({ error: 'Buddy could not answer just now. Please try again or ask a trusted adult.' });
    }

    const payload = await response.json();
    const content = outputText(payload);
    if (!content) return res.status(502).json({ error: 'Buddy did not return an answer. Please try again.' });

    return res.status(200).json({
      content,
      riskLevel,
      adultActionRequired: riskLevel === 'concern',
    });
  } catch (error) {
    console.error('Buddy endpoint failed', error instanceof Error ? error.message : 'Unknown error');
    return res.status(502).json({ error: 'Buddy is having trouble connecting. Please try again or ask a trusted adult.' });
  }
};
