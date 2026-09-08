import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from 'hooks/useAuth';
import { DIRECT_ADULT_GUIDANCE, SUPPORT_RECORDING_ENABLED } from 'constants/releaseCapabilities';
import { fetchTrustedAdultsForChild, requestTrustedAdultSupport, TrustedAdultRecord } from 'services/supabase/autismProfileService';

type Source = 'buddy-conversation' | 'mood-check-in' | 'child-dashboard';
interface Props { source: Source; urgent: boolean; contextKey: string; }

function RequestForm({ childId, source, urgent }: { childId: string; source: Source; urgent: boolean }) {
  const [adults, setAdults] = useState<TrustedAdultRecord[]>([]);
  const [recipient, setRecipient] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [lookupError, setLookupError] = useState(false);
  const ids = useRef(new Map<string, string>());
  useEffect(() => {
    let cancelled = false;
    fetchTrustedAdultsForChild(childId).then(rows => {
      if (!cancelled) setAdults(rows.filter(row => row.status === 'connected'));
    }).catch(() => { if (!cancelled) setLookupError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [childId]);
  const record = async () => {
    const key = `${source}:${urgent}:${recipient}`;
    const id = ids.current.get(key) ?? crypto.randomUUID();
    ids.current.set(key, id);
    setSaving(true); setStatus('');
    try {
      await requestTrustedAdultSupport(childId, source, urgent, id, recipient || null);
      setStatus(recipient
        ? 'Recorded for your selected adult in AdaptBuddy. This does not confirm they have seen it. Please speak to them directly.'
        : 'Recorded privately for you. No adult received this request. Please speak to a safe adult nearby.');
    } catch {
      setStatus('We could not confirm the record. Please speak to a safe adult directly. You can retry without creating a duplicate.');
    } finally { setSaving(false); }
  };
  return <div className="mt-4 space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-slate-900">
    <p>{DIRECT_ADULT_GUIDANCE}</p>
    <p>This records a request for help. Your private journal, mood note and conversation are not included. There is no guaranteed response time.</p>
    {lookupError && <p role="alert">We could not check your adult connections. You can still keep a private record.</p>}
    <label className="block font-semibold">Who can see this request?
      <select className="mt-1 block w-full rounded-lg border p-2" value={recipient} onChange={e => setRecipient(e.target.value)} disabled={loading || saving}>
        <option value="">Only me — private record</option>
        {adults.map(adult => <option key={adult.id} value={adult.id}>{adult.name}</option>)}
      </select>
    </label>
    <button type="button" onClick={() => void record()} disabled={loading || saving} className="rounded-xl bg-red-700 px-4 py-2 font-bold text-white disabled:opacity-50">
      {saving ? 'Recording…' : 'Record support request'}
    </button>
    {status && <p role="status">{status}</p>}
  </div>;
}

export default function SupportRequestAction({ source, urgent, contextKey }: Props) {
  const { user, isGuest, profile } = useAuth();
  if (!SUPPORT_RECORDING_ENABLED) return <p className="mt-3 text-sm">{DIRECT_ADULT_GUIDANCE}</p>;
  if (!user?.id || isGuest || profile?.role !== 'child') return <p className="mt-3 text-sm">Please show this screen to a safe adult nearby. Sign in as a child to keep a support record.</p>;
  return <RequestForm key={`${user.id}:${contextKey}`} childId={user.id} source={source} urgent={urgent} />;
}
