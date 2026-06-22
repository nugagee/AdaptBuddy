import React, { useState } from 'react';
import { BookOpen, Loader2, Plus } from 'lucide-react';
import { buildCompanionContext, generateSocialStory, isOpenAiConfigured } from 'services/ai';
import { useAutismProfileStore } from 'features/child/store/autismProfileStore';
import { useAuth } from 'hooks/useAuth';

const SCENARIO_SUGGESTIONS = [
  'Going to a birthday party',
  'First day at a new school',
  'Visiting the dentist',
  'Getting a haircut',
  'Joining a sports club',
  'When the plan changes',
];

const SocialStoryGeneratorPanel: React.FC = () => {
  const { profile: authProfile } = useAuth();
  const autismProfile = useAutismProfileStore((s) => s.profile);
  const addSocialStory = useAutismProfileStore((s) => s.addSocialStory);

  const [scenario, setScenario] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [panels, setPanels] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const ctx = buildCompanionContext(
    autismProfile,
    authProfile?.first_name || 'friend',
    authProfile?.age ?? null,
  );

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setSaved(false);
    setTitle('');
    setPanels([]);
    try {
      const story = await generateSocialStory(scenario, ctx);
      setTitle(story.title);
      setPanels(story.panels);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not generate your story.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!title || panels.length === 0) return;
    addSocialStory({ title, panels });
    setSaved(true);
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600 dark:text-gray-400">
        Describe a situation that feels tricky. AdaptBuddy will create a personal social story just
        for you.
      </p>

      {!isOpenAiConfigured && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Add OpenAI key for fully personalised stories. A template story is used until then.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {SCENARIO_SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScenario(s)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-adapt-indigo dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            {s}
          </button>
        ))}
      </div>

      <textarea
        value={scenario}
        onChange={(e) => setScenario(e.target.value)}
        rows={3}
        placeholder="Describe the situation…"
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      />

      <button
        type="button"
        onClick={() => void handleGenerate()}
        disabled={loading || !scenario.trim()}
        className="inline-flex items-center gap-2 rounded-2xl bg-adapt-indigo px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-adapt-cyan dark:text-gray-900"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
        Create my story
      </button>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {panels.length > 0 && (
        <div className="space-y-4 rounded-2xl border border-violet-200/60 bg-violet-50/50 p-5 dark:border-violet-500/20 dark:bg-violet-950/20">
          <h3 className="text-lg font-bold text-adapt-navy dark:text-gray-100">{title}</h3>
          <div className="space-y-3">
            {panels.map((panel, i) => (
              <div
                key={i}
                className="rounded-xl bg-white/80 px-4 py-3 text-sm text-adapt-navy dark:bg-gray-900/60 dark:text-gray-200"
              >
                <span className="mr-2 font-bold text-adapt-indigo dark:text-adapt-cyan">{i + 1}.</span>
                {panel}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500"
          >
            <Plus className="h-3.5 w-3.5" />
            {saved ? 'Saved to my stories' : 'Save to Autism Space'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SocialStoryGeneratorPanel;
