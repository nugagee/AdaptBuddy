import React, { useCallback, useEffect, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { BUDDY_MESSAGES, pickRandomBuddyMessage } from 'constants/buddyMessages';
import { useUiStore } from 'store/uiStore';

const CHAR_DELAY_MS = 42;
const PAUSE_AFTER_COMPLETE_MS = 4000;
const ROTATE_STATIC_MS = 5500;

interface TypingBuddyMessageProps {
  className?: string;
  showShuffle?: boolean;
}

const TypingBuddyMessage: React.FC<TypingBuddyMessageProps> = ({
  className = '',
  showShuffle = true,
}) => {
  const reducedMotionPref = useUiStore((s) => s.reducedMotion);
  const [messageIndex, setMessageIndex] = useState(() => pickRandomBuddyMessage());
  const [displayed, setDisplayed] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  const [systemReducedMotion, setSystemReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSystemReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const motionDisabled = reducedMotionPref || systemReducedMotion;
  const fullText = BUDDY_MESSAGES[messageIndex];

  const shuffleMessage = useCallback(() => {
    setMessageIndex((prev) => pickRandomBuddyMessage(prev));
  }, []);

  useEffect(() => {
    if (motionDisabled) {
      setDisplayed(fullText);
      const rotateId = window.setInterval(() => {
        setMessageIndex((prev) => pickRandomBuddyMessage(prev));
      }, ROTATE_STATIC_MS);
      return () => window.clearInterval(rotateId);
    }

    let charIndex = 0;
    let typingTimer: number | undefined;
    let pauseTimer: number | undefined;

    setDisplayed('');
    setShowCursor(true);

    const typeNextChar = () => {
      if (charIndex < fullText.length) {
        setDisplayed(fullText.slice(0, charIndex + 1));
        charIndex += 1;
        typingTimer = window.setTimeout(typeNextChar, CHAR_DELAY_MS);
      } else {
        pauseTimer = window.setTimeout(() => {
          setMessageIndex((prev) => pickRandomBuddyMessage(prev));
        }, PAUSE_AFTER_COMPLETE_MS);
      }
    };

    typingTimer = window.setTimeout(typeNextChar, CHAR_DELAY_MS);

    return () => {
      window.clearTimeout(typingTimer);
      window.clearTimeout(pauseTimer);
    };
  }, [messageIndex, fullText, motionDisabled]);

  useEffect(() => {
    if (motionDisabled) return undefined;
    const blink = window.setInterval(() => setShowCursor((c) => !c), 530);
    return () => window.clearInterval(blink);
  }, [motionDisabled]);

  return (
    <div className="relative pr-10">
      <p className={className} aria-live="polite" aria-atomic="true">
        {displayed}
        <span
          className={`ml-0.5 inline-block w-0.5 align-middle bg-adapt-indigo transition-opacity duration-100 ${
            showCursor ? 'opacity-100' : 'opacity-0'
          } ${motionDisabled ? 'hidden' : ''}`}
          style={{ height: '1em' }}
          aria-hidden
        />
      </p>

      {showShuffle && (
        <button
          type="button"
          onClick={shuffleMessage}
          className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-adapt-indigo shadow-soft transition hover:scale-105 hover:border-adapt-indigo/30 hover:bg-adapt-mist hover:shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-adapt-indigo focus-visible:ring-offset-2"
          aria-label="Show another Buddy message"
          title="New message"
        >
          <Shuffle className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
};

export default TypingBuddyMessage;
