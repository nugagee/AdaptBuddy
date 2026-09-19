import SupportRequestAction from 'components/support/SupportRequestAction';
import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader2, Send, ShieldCheck, UserRound } from 'lucide-react';
import { buildCompanionContext, sendBuddyMessage } from 'services/ai';
import {
  getCurrentReadyChildSupportProfile,
  useActiveChildSupportProfile,
} from 'features/child/hooks/useActiveChildSupportProfile';
import type { BuddyChatMessage } from 'features/child/types/companionOnboarding';

const QUICK_MESSAGES = [
  'I do not understand',
  'Help me find the words',
  'Make this easier',
  'Show me one step at a time',
  'I need a break',
  'I need help from an adult',
];

function messageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const createInitialMessages = (): BuddyChatMessage[] => [
  {
    id: 'buddy-intro',
    role: 'assistant',
    content: 'Hi! I am an AI helper. I can make words clearer, help with a next step, or help you ask a trusted adult.',
  },
];

interface BuddyConversationPanelProps {
  initialMessage?: string;
}

const BuddyConversationPanel: React.FC<BuddyConversationPanelProps> = ({ initialMessage }) => {
  const {
    age,
    childId,
    isReady,
    preferredName,
    supportProfile,
  } = useActiveChildSupportProfile();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<BuddyChatMessage[]>(createInitialMessages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const initialMessageSent = useRef(false);
  const conversationRef = useRef<HTMLDivElement>(null);
  const requestVersionRef = useRef(0);
  const requestInFlightRef = useRef(false);
  const resetScopeRef = useRef<string | null | undefined>(undefined);

  const context = useMemo(
    () => buildCompanionContext(
      supportProfile,
      preferredName,
      age,
    ),
    [age, preferredName, supportProfile],
  );

  useEffect(() => {
    // React StrictMode replays effects in development. Only reset once for the
    // same owner so a route-provided initial message is never submitted twice.
    if (resetScopeRef.current === childId) return;
    resetScopeRef.current = childId;
    requestVersionRef.current += 1;
    requestInFlightRef.current = false;
    initialMessageSent.current = false;
    setInput('');
    setMessages(createInitialMessages());
    setLoading(false);
    setError('');
  }, [childId]);

  const send = useCallback(async (chosen?: string) => {
    const content = (chosen ?? input).trim();
    if (!content || requestInFlightRef.current) return;

    const requestOwnerId = childId;
    if (
      !requestOwnerId
      || !supportProfile
      || !getCurrentReadyChildSupportProfile(requestOwnerId)
    ) {
      setError('Your support profile is still getting ready. Please try again in a moment.');
      return;
    }

    const requestVersion = ++requestVersionRef.current;
    const conversationHistory = messages;
    requestInFlightRef.current = true;

    const userMessage: BuddyChatMessage = { id: messageId(), role: 'user', content };
    const nextMessages = [...conversationHistory, userMessage];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const response = await sendBuddyMessage(content, context, conversationHistory);
      if (
        requestVersionRef.current !== requestVersion
        || !getCurrentReadyChildSupportProfile(requestOwnerId)
      ) {
        return;
      }
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: 'assistant',
          content: response.content,
          riskLevel: response.riskLevel,
          adultActionRequired: response.adultActionRequired,
        },
      ]);
    } catch (caught: unknown) {
      if (
        requestVersionRef.current === requestVersion
        && getCurrentReadyChildSupportProfile(requestOwnerId)
      ) {
        setError(caught instanceof Error ? caught.message : 'Buddy could not answer just now.');
      }
    } finally {
      if (requestVersionRef.current === requestVersion) {
        requestInFlightRef.current = false;
        setLoading(false);
      }
    }
  }, [childId, context, input, messages, supportProfile]);

  useEffect(() => {
    if (!initialMessage || !isReady || initialMessageSent.current) return;
    initialMessageSent.current = true;
    void send(initialMessage);
  }, [initialMessage, isReady, send]);

  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [loading, messages]);


  const submit = (event: FormEvent) => { event.preventDefault(); void send(); };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>
            <strong>I am an AI helper, not a person.</strong> I can make mistakes. You can stop at
            any time. If you may be unsafe, I will tell you to go to a safe adult nearby.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Quick things to tell Buddy">
        {QUICK_MESSAGES.map((message) => (
          <button
            key={message}
            type="button"
            onClick={() => void send(message)}
            disabled={loading || !isReady}
            className="rounded-full border border-adapt-indigo/25 bg-white px-3 py-2 text-sm font-semibold text-adapt-navy hover:border-adapt-indigo hover:bg-adapt-indigo/5 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            {message}
          </button>
        ))}
      </div>

      {!isReady && (
        <p className="text-sm text-slate-500 dark:text-gray-400" role="status">
          Your support profile is getting ready…
        </p>
      )}

      <div
        ref={conversationRef}
        role="log"
        aria-label="Conversation with AI Buddy"
        aria-live="polite"
        aria-relevant="additions"
        aria-atomic="false"
        aria-busy={loading}
        className="max-h-[28rem] space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-4 dark:bg-gray-950/50"
      >
        {messages.map((message) => (
          <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              message.role === 'user'
                ? 'bg-adapt-indigo text-white'
                : message.riskLevel === 'urgent'
                  ? 'border-2 border-red-400 bg-red-50 text-red-950 dark:bg-red-950/40 dark:text-red-100'
                  : 'border border-slate-200 bg-white text-adapt-navy dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'
            }`}>
              <div className="mb-1 flex items-center gap-2 text-xs font-bold opacity-75">
                {message.role === 'user' ? <UserRound className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                {message.role === 'user' ? 'You' : 'AI Buddy'}
              </div>
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
              {message.adultActionRequired && <SupportRequestAction source="buddy-conversation" urgent={message.riskLevel === 'urgent'} contextKey={message.id} />}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-500" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Buddy is making this clear…
          </div>
        )}
      </div>


      {error && <p className="text-sm font-semibold text-red-700 dark:text-red-300" role="alert">{error}</p>}

      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="buddy-message">Tell Buddy what you need</label>
        <textarea
          id="buddy-message"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          maxLength={1200}
          rows={2}
          disabled={!isReady}
          placeholder="Type what you need…"
          className="min-h-14 flex-1 resize-none rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-adapt-navy outline-none focus:border-adapt-indigo dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <button
          type="submit"
          disabled={loading || !input.trim() || !isReady}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-adapt-indigo px-5 py-3 font-bold text-white hover:bg-adapt-purple disabled:opacity-50 dark:bg-adapt-cyan dark:text-gray-950"
        >
          <Send className="h-5 w-5" aria-hidden />
          Send
        </button>
      </form>
    </div>
  );
};

export default BuddyConversationPanel;
