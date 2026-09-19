import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from 'hooks/useAuth';
import { DIRECT_ADULT_GUIDANCE, TRUSTED_ADULT_INVITATIONS_ENABLED } from 'constants/releaseCapabilities';
import { acknowledgeSupportRequest, fetchAdultSupportInvitations, fetchSupportRequests, fetchTrustedAdultsForChild, respondToSupportInvitation, revokeSupportContact, saveTrustedAdultForChild, SupportRequestRecord, TrustedAdultRecord } from 'services/supabase/autismProfileService';

const inputClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-white p-2 text-slate-900';
const buttonClass = 'rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
const errorMessage = (error: unknown) => error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Could not complete this action. Please try again.';

function Connections({ userId, child }: { userId: string; child: boolean }) {
  const [contacts, setContacts] = useState<TrustedAdultRecord[]>([]);
  const [requests, setRequests] = useState<SupportRequestRecord[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('parent');
  const [email, setEmail] = useState('');
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const mounted = useRef(true);
  const load = useCallback(async () => {
    const [nextContacts, nextRequests] = await Promise.all([
      child ? fetchTrustedAdultsForChild(userId) : fetchAdultSupportInvitations(), fetchSupportRequests(),
    ]);
    if (mounted.current) { setContacts(nextContacts); setRequests(nextRequests); }
  }, [child, userId]);
  useEffect(() => {
    mounted.current = true;
    load().catch(e => { if (mounted.current) setError(errorMessage(e)); })
      .finally(() => { if (mounted.current) setBusy(false); });
    return () => { mounted.current = false; };
  }, [load]);
  const act = async (operation: () => Promise<unknown>, message: string) => {
    setBusy(true); setError(''); setStatus('');
    try {
      await operation();
      if (!mounted.current) return;
      setStatus(message); await load();
    } catch (e) { if (mounted.current) setError(errorMessage(e)); }
    finally { if (mounted.current) setBusy(false); }
  };
  return <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
    <div><h2 className="text-xl font-bold">{child ? 'Trusted adults and support history' : 'Invitations and support inbox'}</h2>
      <p className="mt-2 text-sm">An accepted connection shares only support requests the child chooses to address to that adult. It does not grant access to private journals, learning profiles or school decisions.</p>
      <p className="mt-2 text-sm">Invitations appear in the adult’s signed-in parent account. No email or text alert is sent. Check this inbox yourself; there is no guaranteed response time.</p>
    </div>
    <button type="button" disabled={busy} onClick={() => void act(async () => {}, '')} className={buttonClass}>Refresh support inbox</button>
    {busy && <p role="status">Loading…</p>}
    {error && <p role="alert" className="text-red-700 dark:text-red-300">{error}</p>}
    {status && <p role="status">{status}</p>}
    {!child && contacts.some(c => c.status === 'pending') && <label className="flex gap-2 text-sm">
      <input type="checkbox" checked={adultConfirmed} onChange={e => setAdultConfirmed(e.target.checked)} />
      I am 18 or over and understand that accepting lets the child share support requests with me.
    </label>}
    <p className="text-sm">Accepted connections appear first. Up to 100 invitations and history items are shown. An adult can have up to 50 accepted support connections.</p>
    <ul className="space-y-3" aria-label="Support connections">
      {contacts.map(contact => <li key={contact.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
        <p className="font-semibold">{child ? contact.name : `Invitation from ${contact.child_name || 'a child'}`}</p>
        <p className="text-sm">{contact.status === 'connected' ? 'Accepted — support requests only' : contact.status === 'pending' ? 'Awaiting acceptance' : contact.status}</p>
        {child && <p className="text-sm">{contact.email}</p>}
        {!child && contact.status === 'pending' && <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonClass} disabled={busy || !adultConfirmed} onClick={() => void act(() => respondToSupportInvitation(contact.id, true, adultConfirmed), 'Invitation accepted for support requests only.')}>Accept invitation</button>
          <button type="button" className={buttonClass} disabled={busy} onClick={() => void act(() => respondToSupportInvitation(contact.id, false), 'Invitation declined.')}>Decline invitation</button>
        </div>}
        {(contact.status === 'connected' || (child && contact.status === 'pending')) && <button type="button" disabled={busy} className={buttonClass}
          onClick={() => void act(() => revokeSupportContact(contact.id), 'Connection ended. This adult can no longer read requests through it.')}>
          {contact.status === 'pending' ? 'Cancel invitation' : 'End support connection'}
        </button>}
      </li>)}
    </ul>
    {!busy && !error && contacts.length === 0 && <p>No support invitations or accepted connections yet.</p>}
    {child && <div className="space-y-3 rounded-xl bg-slate-50 p-4 text-slate-900">
      <h3 className="font-bold">Invite a trusted adult</h3>
      <p className="text-sm">Your first name will appear with the invitation. Tell the adult to sign in with the exact email below and open their support inbox. Invitations expire after 30 days.</p>
      <label className="block">Adult’s name<input className={inputClass} value={name} maxLength={120} onChange={e => setName(e.target.value)} /></label>
      <label className="block">Relationship<select className={inputClass} value={role} onChange={e => setRole(e.target.value)}>
        <option value="parent">Parent</option><option value="guardian">Guardian</option><option value="grandparent">Grandparent</option><option value="carer">Carer</option>
      </select></label>
      <label className="block">Adult’s email<input className={inputClass} type="email" value={email} maxLength={254} onChange={e => setEmail(e.target.value)} /></label>
      <button type="button" className={buttonClass} disabled={busy || !name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())}
        onClick={() => void act(async () => {
          await saveTrustedAdultForChild(userId, { name, role, email, phone: '' });
          if (mounted.current) { setName(''); setEmail(''); }
        }, 'Invitation recorded in AdaptBuddy. No email or text was sent. The adult must accept before you can share a request.')}>Create in-app invitation</button>
    </div>}
    <div className="space-y-3"><h3 className="font-bold">{child ? 'Your support records' : 'Requests addressed to you'}</h3>
      {!busy && !error && requests.length === 0 && <p>No support records yet.</p>}
      {requests.map(request => <article key={request.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
        <p className="font-semibold">{child ? 'You recorded a request for support' : `${request.child_name || 'A child'} asked for support`}{request.urgent ? ' — urgent' : ''}</p>
        <p className="text-sm">{new Date(request.created_at).toLocaleString()}</p>
        <p className="text-sm">{request.contact_id ? `${request.adult_name || 'Selected adult'}${request.connection_active ? '' : ' — connection ended; access removed'}` : 'Private record — only you can see it'}</p>
        <p className="text-sm">{request.seen_at ? `Marked as seen ${new Date(request.seen_at).toLocaleString()}. This does not confirm that help was provided.` : 'Not marked as seen.'}</p>
        {!child && !request.seen_at && <button type="button" className={buttonClass} disabled={busy} onClick={() => void act(() => acknowledgeSupportRequest(request.id), 'Marked as seen. Please contact the child directly to offer support.')}>Mark as seen</button>}
      </article>)}
    </div>
    <p className="text-sm">{DIRECT_ADULT_GUIDANCE} If there is immediate danger, call 999.</p>
  </section>;
}

export default function SupportConnectionsPanel() {
  const { user, profile, isGuest } = useAuth();
  if (!TRUSTED_ADULT_INVITATIONS_ENABLED) return <section className="rounded-2xl border p-5"><h2 className="font-bold">Trusted adult</h2><p>Trusted-adult connections are temporarily unavailable. {DIRECT_ADULT_GUIDANCE}</p></section>;
  if (!user?.id || isGuest) return <p>Sign in to manage real support invitations and requests. {DIRECT_ADULT_GUIDANCE}</p>;
  if (profile?.role !== 'child' && profile?.role !== 'parent') return null;
  return <Connections key={`${user.id}:${profile.role}`} userId={user.id} child={profile.role === 'child'} />;
}
