import React, { useState } from 'react';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { buildCompanionContext, isOpenAiConfigured, simplifyLanguage } from 'services/ai';
import { useAutismProfileStore } from 'features/child/store/autismProfileStore';
import { useAuth } from 'hooks/useAuth';

const LanguageSimplifierPanel: React.FC = () => {
  const { profile: authProfile } = useAuth();
  const autismProfile = useAutismProfileStore((s) => s.profile);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [steps, setSteps] = useState<string[]>([]);
  const [tip, setTip] = useState('');

  const ctx = buildCompanionContext(
    autismProfile,
    authProfile?.first_name || 'friend',
    authProfile?.age ?? null,
  );

  const handleSimplify = async () => {
    setLoading(true);
    setError('');
    setSteps([]);
    setTip('');
    try {
      const result = await simplifyLanguage(input, ctx);
      setSteps(result.simplified);
      setTip(result.tip ?? '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not simplify that text.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600 dark:text-gray-400">
        Paste something confusing — a homework instruction, a teacher message, or anything hard to
        understand. AdaptBuddy will break it into clear steps.
      </p>

      {!isOpenAiConfigured && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Add <code className="font-mono">REACT_APP_OPENAI_API_KEY</code> to enable full AI
          simplification. A basic fallback is used until then.
        </p>
      )}

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={4}
        placeholder='e.g. "Complete the worksheet and submit it before break."'
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-adapt-navy outline-none focus:border-adapt-indigo dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      />

      <button
        type="button"
        onClick={() => void handleSimplify()}
        disabled={loading || !input.trim()}
        className="inline-flex items-center gap-2 rounded-2xl bg-adapt-indigo px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-adapt-cyan dark:text-gray-900"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
        Simplify for me
      </button>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {steps.length > 0 && (
        <div className="rounded-2xl border border-adapt-indigo/20 bg-adapt-indigo/5 p-5 dark:border-adapt-cyan/20 dark:bg-adapt-cyan/5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-adapt-indigo dark:text-adapt-cyan">
            <Sparkles className="h-4 w-4" aria-hidden />
            Clear steps
          </div>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-adapt-navy dark:text-gray-200">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-adapt-indigo/15 text-xs font-bold text-adapt-indigo dark:bg-adapt-cyan/15 dark:text-adapt-cyan">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          {tip && <p className="mt-4 text-xs text-slate-500 dark:text-gray-400">{tip}</p>}
        </div>
      )}
    </div>
  );
};

export default LanguageSimplifierPanel;
