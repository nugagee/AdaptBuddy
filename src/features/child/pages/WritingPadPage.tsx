import React, { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import WritingPad, {
  type WritingPadSaveResult,
} from 'features/child/components/writing-pad/WritingPad';
import { useAuth } from 'hooks/useAuth';
import {
  getReadyChildProgressForOwner,
  resolveChildScopeId,
} from 'features/child/store/childProgressReadAccess';
import { resolveRoutedActivity } from 'features/child/routing/routedActivityCompletion';

const WritingPadPage: React.FC = () => {
  const location = useLocation();
  const { user, profile, isGuest } = useAuth();
  const childScopeId = resolveChildScopeId({
    userId: user?.id ?? null,
    profileId: profile?.id ?? null,
    profileRole: profile?.role ?? null,
    isGuest: Boolean(isGuest),
  });
  const neuroTypes = profile?.neuro_types ?? [];
  const routedActivity = useMemo(
    () => resolveRoutedActivity({
      search: location.search,
      expectedPathname: location.pathname,
      neuroTypes,
      completion: 'writing-save',
    }),
    [location.pathname, location.search, neuroTypes],
  );

  const handleSave = useCallback((result: WritingPadSaveResult) => {
    if (
      !routedActivity
      || !childScopeId
      || result.ownerId !== childScopeId
      || !result.hadSessionContribution
      || result.wordCount < 1
    ) return;

    const progress = getReadyChildProgressForOwner(childScopeId);
    if (!progress) return;
    progress.completeActivity(
      routedActivity.id,
      routedActivity.neuroId,
      routedActivity.starsReward,
      routedActivity.durationMinutes,
    );
  }, [childScopeId, routedActivity]);

  return <WritingPad onSave={handleSave} />;
};

export default WritingPadPage;
