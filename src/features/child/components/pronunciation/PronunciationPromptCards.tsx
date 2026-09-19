import React from 'react';
import { BookOpen, Mic, RefreshCw, Volume2 } from 'lucide-react';
import { useUiStore } from 'store/uiStore';
import './pronunciation-audio.css';
import GuidedPracticeTools from './GuidedPracticeTools';

const PronunciationPromptCards: React.FC<{
  onHear: () => void; onSay: () => void; onRetry: () => void; onWords: () => void;
}> = ({ onHear, onSay, onRetry, onWords }) => {
  const calm = useUiStore(state => state.reducedMotion);
  const cards = [
    { title: 'Hear it', text: 'Play the example. Your microphone can stay off.', icon: Volume2, action: onHear },
    { title: 'Say it', text: 'Open microphone and replay choices. Nothing records automatically.', icon: Mic, action: onSay },
    { title: 'Try again', text: 'Start a fresh try without changing your earlier scores.', icon: RefreshCw, action: onRetry },
    { title: 'Keep words', text: 'Open your word bank and add a practice item.', icon: BookOpen, action: onWords },
  ];
  return <><section aria-label="Practice shortcuts" className="pronunciation-motion grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-calm={calm ? 'true' : 'false'}>
    {cards.map(({ title, text, icon: Icon, action }) => <button key={title} type="button" aria-label={title} onClick={action}
      className="pronunciation-action rounded-3xl border border-indigo-100 bg-white p-4 text-left shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 dark:border-slate-700 dark:bg-slate-900">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-200"><Icon className="pronunciation-icon h-5 w-5" aria-hidden /></span>
      <span className="block font-black">{title}</span><span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">{text}</span>
    </button>)}
  </section><GuidedPracticeTools /></>;
};
export default PronunciationPromptCards;
