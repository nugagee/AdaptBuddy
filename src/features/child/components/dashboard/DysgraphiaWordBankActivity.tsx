import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Save, Trash2 } from 'lucide-react';
import type { DysgraphiaWordBankSessionInput } from 'features/child/store/childProgressStore';

export type { DysgraphiaWordBankSessionInput } from 'features/child/store/childProgressStore';

interface DysgraphiaWordBankActivityProps {
  onComplete: (session: DysgraphiaWordBankSessionInput) => void;
}

interface WordChoice {
  id: string;
  label: string;
  spokenLabel?: string;
}

interface WordBankPrompt {
  id: string;
  title: string;
  helper: string;
  words: readonly WordChoice[];
}

const WORD_BANK_PROMPTS: readonly WordBankPrompt[] = [
  {
    id: 'my-school-day',
    title: 'My school day',
    helper: 'Build a sentence about something you did or felt at school.',
    words: [
      { id: 'today', label: 'Today' },
      { id: 'i', label: 'I' },
      { id: 'at-school', label: 'at school' },
      { id: 'read', label: 'read' },
      { id: 'made', label: 'made' },
      { id: 'played', label: 'played' },
      { id: 'learned', label: 'learned' },
      { id: 'something-new', label: 'something new' },
      { id: 'with-my-friend', label: 'with my friend' },
      { id: 'felt-happy', label: 'felt happy' },
      { id: 'felt-proud', label: 'felt proud' },
      { id: 'full-stop', label: '.', spokenLabel: 'full stop' },
    ],
  },
  {
    id: 'a-helpful-person',
    title: 'A helpful person',
    helper: 'Build a sentence about someone who helps you.',
    words: [
      { id: 'my', label: 'My' },
      { id: 'friend', label: 'friend' },
      { id: 'teacher', label: 'teacher' },
      { id: 'family', label: 'family' },
      { id: 'helps-me', label: 'helps me' },
      { id: 'listen', label: 'listen' },
      { id: 'learn', label: 'learn' },
      { id: 'start', label: 'start' },
      { id: 'feel-calm', label: 'feel calm' },
      { id: 'when-i-need-it', label: 'when I need it' },
      { id: 'full-stop', label: '.', spokenLabel: 'full stop' },
    ],
  },
  {
    id: 'ask-for-help',
    title: 'Ask for help',
    helper: 'Build a clear sentence you can use when a task feels difficult.',
    words: [
      { id: 'please', label: 'Please' },
      { id: 'can', label: 'can' },
      { id: 'you', label: 'you' },
      { id: 'help', label: 'help' },
      { id: 'me', label: 'me' },
      { id: 'start', label: 'start' },
      { id: 'read-this', label: 'read this' },
      { id: 'write-this', label: 'write this' },
      { id: 'understand', label: 'understand' },
      { id: 'one-step', label: 'one step' },
      { id: 'question-mark', label: '?', spokenLabel: 'question mark' },
    ],
  },
];

const CONFIDENCE_OPTIONS: ReadonlyArray<{
  id: DysgraphiaWordBankSessionInput['confidence'];
  label: string;
}> = [
  { id: 'confident', label: 'I feel confident' },
  { id: 'practised', label: 'I practised' },
  { id: 'need-help', label: 'I need help' },
];

const createSessionId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `dysgraphia-word-bank-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const readableLabel = (word: WordChoice) => word.spokenLabel ?? word.label;

const formatSentence = (words: WordChoice[]) => words.reduce((sentence, word) => {
  if (word.label === '.' || word.label === '?') return `${sentence.trimEnd()}${word.label}`;
  return sentence ? `${sentence} ${word.label}` : word.label;
}, '');

const DysgraphiaWordBankActivity: React.FC<DysgraphiaWordBankActivityProps> = ({
  onComplete,
}) => {
  const [sessionId] = useState(createSessionId);
  const [promptId, setPromptId] = useState(WORD_BANK_PROMPTS[0].id);
  const [selectedWords, setSelectedWords] = useState<WordChoice[]>([]);
  const [editsMade, setEditsMade] = useState(0);
  const [checksMade, setChecksMade] = useState(0);
  const [usedRemove, setUsedRemove] = useState(false);
  const [usedReorder, setUsedReorder] = useState(false);
  const [confidence, setConfidence] = useState<DysgraphiaWordBankSessionInput['confidence'] | null>(null);
  const [feedback, setFeedback] = useState(
    'Choose word cards in your own order. There is no score and no timer.',
  );

  const prompt = useMemo(
    () => WORD_BANK_PROMPTS.find((candidate) => candidate.id === promptId) ?? WORD_BANK_PROMPTS[0],
    [promptId],
  );
  const selectedWordIds = useMemo(
    () => new Set(selectedWords.map((word) => word.id)),
    [selectedWords],
  );
  const sentence = formatSentence(selectedWords);

  const choosePrompt = (nextPrompt: WordBankPrompt) => {
    setPromptId(nextPrompt.id);
    setSelectedWords([]);
    setEditsMade(0);
    setChecksMade(0);
    setUsedRemove(false);
    setUsedReorder(false);
    setConfidence(null);
    setFeedback('Choose word cards in your own order. There is no score and no timer.');
  };

  const addWord = (word: WordChoice) => {
    if (selectedWordIds.has(word.id)) return;
    setSelectedWords((current) => [...current, word]);
    setEditsMade((current) => current + 1);
    setFeedback(`${readableLabel(word)} added. You can add another card, move it, or remove it.`);
  };

  const removeWord = (index: number) => {
    const word = selectedWords[index];
    if (!word) return;
    setSelectedWords((current) => current.filter((_, currentIndex) => currentIndex !== index));
    setEditsMade((current) => current + 1);
    setUsedRemove(true);
    setFeedback(`${readableLabel(word)} removed. You can choose it again.`);
  };

  const moveWord = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= selectedWords.length) return;

    setSelectedWords((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setEditsMade((current) => current + 1);
    setUsedReorder(true);
    setFeedback('Word moved. Keep this order or change it again.');
  };

  const checkSentence = () => {
    setChecksMade((current) => current + 1);
    if (selectedWords.length === 0) {
      setFeedback('Choose at least one word card to begin your sentence.');
      return;
    }
    setFeedback(
      selectedWords.length < 3
        ? 'You have started your sentence. Add another word if that helps you say more.'
        : `Your sentence uses ${selectedWords.length} word cards. Read it, then keep it or change it.`,
    );
  };

  const saveSentence = () => {
    if (editsMade === 0 || selectedWords.length === 0 || confidence === null) return;

    const supportsUsed = ['fixed word bank'];
    if (checksMade > 0) supportsUsed.push('sentence check');
    if (usedReorder) supportsUsed.push('reorder controls');
    if (usedRemove) supportsUsed.push('remove control');

    onComplete({
      sessionId,
      activityId: 'dysgraphia-word-bank',
      promptId: prompt.id,
      promptTitle: prompt.title,
      selectedWordIds: selectedWords.map((word) => word.id),
      selectedWords: selectedWords.map((word) => word.label),
      editsMade,
      checksMade,
      supportsUsed,
      confidence,
    });
  };

  const canSave = editsMade > 0 && selectedWords.length > 0 && confidence !== null;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/25 sm:p-5">
        <h3 className="text-base font-black text-adapt-navy dark:text-gray-100">Choose a sentence idea</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-gray-300">
          Pick one prompt. Your words stay in this activity until you choose to save the practice result.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3" role="group" aria-label="Sentence prompt templates">
          {WORD_BANK_PROMPTS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => choosePrompt(option)}
              aria-label={`Choose ${option.title} prompt`}
              aria-pressed={prompt.id === option.id}
              className={`min-h-16 rounded-2xl border-2 p-4 text-left font-bold transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 ${
                prompt.id === option.id
                  ? 'border-emerald-500 bg-white text-adapt-navy shadow-sm dark:bg-gray-950 dark:text-gray-100'
                  : 'border-transparent bg-white/70 text-slate-700 dark:bg-gray-900 dark:text-gray-200'
              }`}
            >
              {option.title}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <p className="text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
          {prompt.title}
        </p>
        <h3 className="mt-1 text-lg font-black text-adapt-navy dark:text-gray-100">Build with word cards</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-gray-300">{prompt.helper}</p>

        <div className="mt-4 flex flex-wrap gap-3" role="group" aria-label={`Words for ${prompt.title}`}>
          {prompt.words.map((word) => {
            const selected = selectedWordIds.has(word.id);
            return (
              <button
                key={word.id}
                type="button"
                onClick={() => addWord(word)}
                disabled={selected}
                aria-label={`Add ${readableLabel(word)}`}
                className="min-h-12 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-5 py-3 text-base font-black text-emerald-900 transition motion-reduce:transition-none hover:border-emerald-500 disabled:cursor-default disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100 dark:disabled:border-gray-700 dark:disabled:bg-gray-800 dark:disabled:text-gray-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
              >
                {word.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/50 dark:bg-violet-950/25 sm:p-5">
        <h3 className="text-base font-black text-adapt-navy dark:text-gray-100">Your sentence</h3>
        <p
          className="mt-3 min-h-14 rounded-2xl bg-white p-4 text-lg font-bold leading-8 text-adapt-navy shadow-sm dark:bg-gray-950 dark:text-gray-100"
          aria-live="polite"
          data-testid="dysgraphia-built-sentence"
        >
          {sentence || 'Choose a word card to begin.'}
        </p>

        {selectedWords.length > 0 ? (
          <ol className="mt-4 space-y-3" aria-label="Selected word cards">
            {selectedWords.map((word, index) => (
              <li
                key={word.id}
                className="flex flex-col gap-3 rounded-2xl border border-violet-200 bg-white p-3 dark:border-violet-900 dark:bg-gray-900 sm:flex-row sm:items-center"
              >
                <span className="min-w-0 flex-1 text-base font-black text-adapt-navy dark:text-gray-100">
                  {index + 1}. {word.label}
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => moveWord(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${readableLabel(word)} left`}
                    className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-violet-200 bg-violet-50 text-violet-800 disabled:cursor-not-allowed disabled:opacity-40 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
                  >
                    <ArrowLeft className="h-5 w-5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveWord(index, 1)}
                    disabled={index === selectedWords.length - 1}
                    aria-label={`Move ${readableLabel(word)} right`}
                    className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-violet-200 bg-violet-50 text-violet-800 disabled:cursor-not-allowed disabled:opacity-40 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
                  >
                    <ArrowRight className="h-5 w-5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeWord(index)}
                    aria-label={`Remove ${readableLabel(word)}`}
                    className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-300"
                  >
                    <Trash2 className="h-5 w-5" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        ) : null}

        <button
          type="button"
          onClick={checkSentence}
          className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-violet-300 bg-white px-5 py-3 text-sm font-black text-violet-800 dark:border-violet-800 dark:bg-gray-950 dark:text-violet-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
        >
          <Check className="h-5 w-5" aria-hidden />
          Check my sentence
        </button>
        <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-gray-200" role="status">
          {feedback}
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <h3 className="text-base font-black text-adapt-navy dark:text-gray-100">How did this practice feel?</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3" role="group" aria-label="Choose confidence">
          {CONFIDENCE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setConfidence(option.id)}
              aria-pressed={confidence === option.id}
              className={`min-h-12 rounded-2xl border-2 px-4 py-3 text-sm font-black transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 ${
                confidence === option.id
                  ? 'border-emerald-500 bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100'
                  : 'border-slate-200 bg-white text-slate-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {!canSave ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-gray-400">
            Choose at least one word card and how the practice felt before saving.
          </p>
        ) : null}
        <button
          type="button"
          onClick={saveSentence}
          disabled={!canSave}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-3 text-base font-black text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
        >
          <Save className="h-5 w-5" aria-hidden />
          Save sentence practice
        </button>
      </section>
    </div>
  );
};

export default DysgraphiaWordBankActivity;
