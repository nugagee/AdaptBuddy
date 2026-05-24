import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NeuroSelector from 'features/child/components/neuro-selector/NeuroSelector';
import { useAuth } from 'hooks/useAuth';
import { ROUTES } from 'constants/routes';
import { saveNeuroSelection } from 'services/supabase/profileService';

const NeuroSelectorPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, user, setProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async (selected: string[]) => {
    if (!user?.id) {
      setError('You need to be signed in to continue. Please log in and try again.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updated = await saveNeuroSelection(user.id, selected, true, profile);
      setProfile(updated);
      navigate(ROUTES.CHILD_DASHBOARD, {
        replace: true,
        state: { message: 'Your learning space is ready! Welcome aboard.' },
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
        initialSelected={profile?.neuro_types ?? []}
        userName={profile?.first_name || user?.user_metadata?.first_name || 'friend'}
        onContinue={handleContinue}
        saving={saving}
        submitLabel="Create My Calm Space"
      />
    </>
  );
};

export default NeuroSelectorPage;
