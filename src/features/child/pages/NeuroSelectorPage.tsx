import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NeuroSelector from 'features/child/components/neuro-selector/NeuroSelector';
import { useAuth } from 'hooks/useAuth';
import { ROUTES } from 'constants/routes';
import { saveNeuroSelection } from 'services/supabase/profileService';
import { ACTIVE_NEURO_IDS } from 'constants/neuroOptions';

const NeuroSelectorPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, user, isGuest, setProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) return;
    if (profile.companion_onboarding_completed) {
      navigate(ROUTES.CHILD_DASHBOARD, { replace: true });
      return;
    }
    if (profile.neuro_types.length > 0) {
      navigate(ROUTES.COMPANION_ONBOARDING, { replace: true });
    }
  }, [profile, navigate]);

  const handleContinue = async (selected: string[]) => {
    const activeSelection = selected.filter((id) => ACTIVE_NEURO_IDS.has(id));
    if (activeSelection.length === 0) {
      setError('Please select Autism to continue.');
      return;
    }

    if (!user?.id && !isGuest) {
      setError('You need to be signed in to continue. Please log in and try again.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (isGuest && profile) {
        setProfile({
          ...profile,
          neuro_types: activeSelection,
          onboarding_completed: false,
          companion_onboarding_completed: false,
          updated_at: new Date().toISOString(),
        });
        navigate(ROUTES.COMPANION_ONBOARDING, {
          replace: true,
          state: { message: 'Great choice! Let AdaptBuddy get to know you.' },
        });
        return;
      }

      if (!user?.id) return;
      const updated = await saveNeuroSelection(user.id, activeSelection, false, profile);
      setProfile(updated);
      navigate(ROUTES.COMPANION_ONBOARDING, {
        replace: true,
        state: { message: 'Great choice! Let AdaptBuddy get to know you.' },
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Could not save your selections. Please try again.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {error && (
        <div className="fixed top-4 left-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg dark:bg-red-950/90 dark:text-red-300">
          {error}
        </div>
      )}
      <NeuroSelector
        initialSelected={profile?.neuro_types?.length ? profile.neuro_types : ['autism']}
        userName={profile?.first_name || user?.user_metadata?.first_name || 'friend'}
        onContinue={handleContinue}
        saving={saving}
        submitLabel="Continue to meet AdaptBuddy"
      />
    </>
  );
};

export default NeuroSelectorPage;
