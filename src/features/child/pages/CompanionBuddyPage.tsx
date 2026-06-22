import React, { useState } from 'react';
import { BookOpen, Heart, MessageCircle, Sparkles } from 'lucide-react';
import ChildDashboardNavbar from 'features/child/components/layout/ChildDashboardNavbar';
import LanguageSimplifierPanel from 'features/child/components/companion/LanguageSimplifierPanel';
import MoodCheckInPanel from 'features/child/components/companion/MoodCheckInPanel';
import SocialStoryGeneratorPanel from 'features/child/components/companion/SocialStoryGeneratorPanel';
import { useAutismProfileStore } from 'features/child/store/autismProfileStore';
import { useAuth } from 'hooks/useAuth';

type BuddyTab = 'simplify' | 'mood' | 'story';

const tabs: { id: BuddyTab; label: string; icon: React.ElementType; description: string }[] = [
  {
    id: 'simplify',
    label: 'Language Buddy',
    icon: MessageCircle,
    description: 'Turn confusing words into clear steps',
  },
  {
    id: 'mood',
    label: 'Mood Check-In',
    icon: Heart,
    description: 'Share how you feel in your safe space',
  },
  {
    id: 'story',
    label: 'Social Stories',
    icon: BookOpen,
    description: 'Personal stories for tricky situations',
  },
];

const CompanionBuddyPage: React.FC = () => {
  const { profile } = useAuth();
  const autismProfile = useAutismProfileStore((s) => s.profile);
  const [tab, setTab] = useState<BuddyTab>('mood');
  const name = autismProfile.aboutMe?.preferredName || profile?.first_name || 'friend';

  const active = tabs.find((t) => t.id === tab)!;

  return (
    <div className="min-h-screen bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <ChildDashboardNavbar />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-adapt-indigo/15 text-adapt-indigo dark:bg-adapt-cyan/15 dark:text-adapt-cyan">
            <Sparkles className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="text-2xl font-extrabold text-adapt-navy dark:text-gray-100 sm:text-3xl">
            Hi {name}, I&apos;m here with you
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
            Your AI companion — not just tools, but someone who understands you.
          </p>
        </div>

        <div className="mb-6 grid gap-2 sm:grid-cols-3">
          {tabs.map(({ id, label, icon: Icon, description }) => {
            const selected = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-2xl border-2 px-4 py-4 text-left transition ${
                  selected
                    ? 'border-adapt-indigo bg-adapt-indigo/10 dark:border-adapt-cyan dark:bg-adapt-cyan/10'
                    : 'border-slate-200 bg-white/80 hover:border-adapt-indigo/30 dark:border-gray-800 dark:bg-gray-900/60'
                }`}
              >
                <Icon
                  className={`mb-2 h-5 w-5 ${selected ? 'text-adapt-indigo dark:text-adapt-cyan' : 'text-slate-400'}`}
                  aria-hidden
                />
                <p className="text-sm font-bold text-adapt-navy dark:text-gray-100">{label}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">{description}</p>
              </button>
            );
          })}
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/70 sm:p-8">
          <h2 className="mb-1 text-lg font-bold text-adapt-navy dark:text-gray-100">{active.label}</h2>
          <p className="mb-6 text-sm text-slate-500 dark:text-gray-400">{active.description}</p>

          {tab === 'simplify' && <LanguageSimplifierPanel />}
          {tab === 'mood' && <MoodCheckInPanel />}
          {tab === 'story' && <SocialStoryGeneratorPanel />}
        </div>
      </main>
    </div>
  );
};

export default CompanionBuddyPage;
