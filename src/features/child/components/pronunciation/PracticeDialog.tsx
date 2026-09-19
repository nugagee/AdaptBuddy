import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  titleId: string;
  onClose: () => void;
  canRestoreFocus: () => boolean;
  className?: string;
  children: React.ReactNode;
}

/** Modal focus boundary shared by the bubble and read-only spotlight walkthrough. */
export default function PracticeDialog({ titleId, onClose, canRestoreFocus, className = '', children }: Props) {
  const [host] = useState(() => document.createElement('div'));
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  const restore = useRef(canRestoreFocus); restore.current = canRestoreFocus;
  useLayoutEffect(() => {
    const scrollX = window.scrollX; const scrollY = window.scrollY;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    host.dataset.practiceGuidancePortal = 'true';
    document.body.appendChild(host);
    const siblings = Array.from(document.body.children).filter((node): node is HTMLElement => node instanceof HTMLElement && node !== host);
    const attributes = siblings.map(node => ({ node, inert: node.getAttribute('inert'), hidden: node.getAttribute('aria-hidden') }));
    attributes.forEach(({ node }) => { node.setAttribute('inert', ''); node.setAttribute('aria-hidden', 'true'); });
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const title = () => panel.current?.querySelector<HTMLElement>('[data-guidance-title]');
    title()?.focus({ preventScroll: true });
    const tabbables = () => Array.from(panel.current?.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]') ?? [])
      .filter(node => node.tabIndex >= 0 && !node.matches(':disabled') && !node.closest('[hidden], [inert]')
        && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden');
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current(); return; }
      if (event.key !== 'Tab') return;
      const controls = tabbables();
      const first = controls[0]; const last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); title()?.focus(); return; }
      if (!controls.includes(document.activeElement as HTMLElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const focusin = (event: FocusEvent) => {
      if (event.target instanceof Node && !panel.current?.contains(event.target)) title()?.focus({ preventScroll: true });
    };
    document.addEventListener('keydown', keydown, true);
    document.addEventListener('focusin', focusin, true);
    return () => {
      document.removeEventListener('keydown', keydown, true); document.removeEventListener('focusin', focusin, true);
      attributes.forEach(({ node, inert, hidden }) => {
        if (inert === null) node.removeAttribute('inert'); else node.setAttribute('inert', inert);
        if (hidden === null) node.removeAttribute('aria-hidden'); else node.setAttribute('aria-hidden', hidden);
      });
      document.body.style.overflow = oldOverflow;
      host.remove();
      if (restore.current() && previous?.isConnected && !previous.closest('[inert], [hidden]')) {
        window.scrollTo({ left: scrollX, top: scrollY, behavior: 'auto' });
        previous.focus({ preventScroll: true });
      }
    };
  }, [host]);
  return createPortal(<div className={`practice-overlay ${className}`}>
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} className="practice-dialog">{children}</div>
  </div>, host);
}
