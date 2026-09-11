import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { getCurrentChildScopeId, getReadyChildProgressForOwner } from 'features/child/store/childProgressReadAccess';
import { preparePracticeGuidance } from './guidanceMediaBoundary';
import CalmBubble from './CalmBubble';
import PronunciationWalkthrough from './PronunciationWalkthrough';
import './honor-guidance.css';

type Session = { kind: 'bubble' | 'tour'; ownerId: string };
export default function GuidedPracticeTools() {
  const [session, setSession] = useState<Session | null>(null);
  const active = useRef<Session | null>(null);
  const [message, setMessage] = useState('');
  const validOwner = (ownerId: string) => getCurrentChildScopeId() === ownerId && Boolean(getReadyChildProgressForOwner(ownerId));
  useEffect(() => {
    const check = () => {
      const previous = active.current;
      if (previous && !validOwner(previous.ownerId)) {
        active.current = null; setSession(null); setMessage('Guidance closed because the child session changed. Open a fresh session when ready.');
      }
    };
    const offAuth = useAuthStore.subscribe(check); const offProgress = useChildProgressStore.subscribe(check);
    return () => { active.current = null; offAuth(); offProgress(); };
  }, []);
  const open = (kind: Session['kind']) => {
    const ownerId = getCurrentChildScopeId();
    if (active.current || document.hidden) return;
    if (!ownerId || !validOwner(ownerId)) { setMessage('Wait for your practice profile to be ready, then open guidance.'); return; }
    if (!preparePracticeGuidance(ownerId)) { setMessage('Audio could not be confirmed stopped. Close and reopen the practice page before using guidance.'); return; }
    if (!validOwner(ownerId)) return;
    const next = { kind, ownerId }; active.current = next; setSession(next); setMessage('');
  };
  const close = () => { active.current = null; setSession(null); };
  const isCurrent = () => Boolean(session && active.current === session && validOwner(session.ownerId));
  // Allow focus return on ordinary close, but never into a different child's controls.
  const restoreScope = () => Boolean(session && validOwner(session.ownerId));
  return <>
    <section aria-label="Calm and guidance tools" className="guidance-launcher">
      <div className="guidance-launcher-copy"><span className="guidance-mini-bubble" aria-hidden="true" /><div><h2>A moment, your way</h2><p>Take a visual pause or explore the controls one step at a time.</p></div></div>
      <div className="guidance-launcher-actions"><button type="button" className="guidance-button guidance-primary" onClick={() => open('bubble')}>Open Calm Bubble</button><button type="button" className="guidance-button" onClick={() => open('tour')}>Show me how</button></div>
      <p className="guidance-small">Opening either tool stops pronunciation audio and deletes the temporary replay clip. Your scores and saved practice history stay.</p>
      {message && <p role="status" className="guidance-note">{message}</p>}
    </section>
    {session?.kind === 'bubble' && <CalmBubble isCurrent={isCurrent} onClose={close} canRestoreFocus={restoreScope} />}
    {session?.kind === 'tour' && <PronunciationWalkthrough isCurrent={isCurrent} onClose={close} canRestoreFocus={restoreScope} />}
  </>;
}
