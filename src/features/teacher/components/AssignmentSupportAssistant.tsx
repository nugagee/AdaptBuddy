import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import supportCatalog from 'features/teacher/data/assignmentSupportCatalog.json';
import { suggestAssignmentSupport, type AssignmentSupportInput } from '../services/assignmentSupportService';

interface Props {
  assignment: AssignmentSupportInput;
  selectedTools: string[];
  isGuest: boolean;
  disabled: boolean;
  onAddTool: (toolId: string) => void;
}

const AssignmentSupportAssistant: React.FC<Props> = ({ assignment, selectedTools, isGuest, disabled, onAddTool }) => {
  const [reviewed, setReviewed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<AbortController | null>(null);
  const { classId, title, description, assignmentType } = assignment;

  useEffect(() => {
    pending.current?.abort();
    pending.current = null;
    setReviewed(false);
    setSuggestions(null);
    setError(null);
    setLoading(false);
    return () => { pending.current?.abort(); };
  }, [classId, title, description, assignmentType, isGuest]);

  const generate = async () => {
    if (pending.current || !reviewed || isGuest || disabled) return;
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    setSuggestions(null);
    setError(null);
    try {
      const result = await suggestAssignmentSupport({ classId, title, description, assignmentType }, controller.signal);
      if (!controller.signal.aborted) setSuggestions(result);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not get suggestions. Please try later.');
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setLoading(false);
      }
    }
  };

  const tooLong = title.length > 160 || description.length > 1600;
  return (
    <section aria-labelledby="assignment-ai-heading" className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900 dark:bg-indigo-950/20">
      <h3 id="assignment-ai-heading" className="flex items-center gap-2 text-sm font-black text-adapt-navy dark:text-gray-100">
        <Sparkles className="h-4 w-4" aria-hidden /> Assignment AI Assistant
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-gray-300">
        Ask AI to suggest up to three support tools for this task. You choose what to add, then publish when ready.
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-gray-400">
        Only the title, instructions and task type are sent to OpenAI. Remove names, contact details and private student information first. AI suggestions can be unsuitable; review them for your learners.
      </p>
      {isGuest ? (
        <p className="mt-3 text-sm font-semibold">Sign in with a teacher account to use Assignment AI. Guest mode does not make AI requests.</p>
      ) : (
        <>
          <label className="mt-3 flex items-start gap-2 text-sm text-slate-700 dark:text-gray-200">
            <input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} disabled={loading || disabled} className="mt-1 h-4 w-4" />
            I have removed names and private information from this task.
          </label>
          {tooLong && <p className="mt-2 text-sm">For AI suggestions, shorten the title to 160 characters and the instructions to 1,600 characters.</p>}
          <button type="button" onClick={generate} disabled={!reviewed || !classId || !title.trim() || tooLong || loading || disabled}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-adapt-indigo px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {loading ? 'Finding suggestions…' : suggestions === null ? 'Suggest support tools' : 'Suggest again'}
          </button>
        </>
      )}
      <div aria-live="polite" aria-busy={loading}>
        {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-800 dark:text-red-200">{error}</p>}
        {suggestions && (
          <div className="mt-4 space-y-3">
            <p className="text-xs font-bold text-slate-600 dark:text-gray-300">
              {suggestions.length ? 'AI-selected tools · explanations from AdaptBuddy’s tool guide' : 'AI did not suggest tools for this task. You can choose any support tools below.'}
            </p>
            {suggestions.map((id) => {
              const tool = supportCatalog.find((item) => item.id === id)!;
              const added = selectedTools.includes(id);
              return (
                <article key={id} className="rounded-xl border border-indigo-100 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                  <h4 className="text-sm font-bold text-adapt-navy dark:text-gray-100">{tool.label}</h4>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-gray-300">{tool.description}</p>
                  <button type="button" disabled={added || disabled} onClick={() => onAddTool(id)}
                    className="mt-2 rounded-lg border border-indigo-200 px-3 py-2 text-sm font-bold text-adapt-indigo disabled:opacity-60 dark:text-adapt-cyan">
                    {added ? `${tool.label} already selected` : `Add ${tool.label.toLowerCase()}`}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default AssignmentSupportAssistant;
