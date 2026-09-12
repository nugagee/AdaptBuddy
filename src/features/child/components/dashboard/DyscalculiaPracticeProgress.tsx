import React from 'react';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { useChildProgressReadAccess } from 'features/child/store/childProgressReadAccess';

/** Derive practice counts from existing completion records, never from answer accuracy. */
const DyscalculiaPracticeProgress: React.FC = () => {
  const all = useChildProgressStore(state => state.completions);
  const { isReady } = useChildProgressReadAccess();
  const today = new Date().toISOString().slice(0, 10);
  const records = isReady ? all.filter(item => item.neuroId === 'dyscalculia' && item.completedAt.startsWith(today)) : [];
  const patterns = records.filter(item => item.activityId === 'dyscalculia-pattern-blocks').length;
  const stories = records.filter(item => item.activityId === 'dyscalculia-real-world').length;
  return <section aria-label="Pattern and story practice" className="space-y-3 rounded-3xl border-2 border-rose-300 bg-white p-6 text-slate-900 dark:border-rose-800 dark:bg-slate-900 dark:text-slate-100">
    <h2 className="text-xl font-bold">Pattern and story practice</h2>
    {patterns + stories === 0 ? <p>Your reviewed pattern and story exercises will appear here.</p> : <div className="flex flex-wrap gap-4">
      <p>Pattern practices: {patterns}</p><p>Story practices: {stories}</p>
    </div>}
    <p className="text-sm">These are today&apos;s reviewed practice activities, not correct-answer counts. Number Line results are shown separately.</p>
  </section>;
};
export default DyscalculiaPracticeProgress;
