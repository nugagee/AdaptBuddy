import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import FeelingsJournal from './FeelingsJournal';

jest.mock('services/ai/nlpEmotionDetector', () => ({
  EmotionDetector: { analyze: jest.fn() },
}), { virtual: true });

jest.mock('services/supabase/autismProfileService', () => ({
  saveJournalEntry: jest.fn(),
}), { virtual: true });

jest.mock('features/child/store/childProgressReadAccess', () => ({
  getReadyChildProgressForOwner: jest.fn(() => ({})),
}));

jest.mock('store/authStore', () => ({
  useAuthStore: { getState: () => ({ isGuest: true }) },
}));

const replaceWindowProperty = (key: string, value: unknown) => {
  const original = Object.getOwnPropertyDescriptor(window, key);
  Object.defineProperty(window, key, { configurable: true, value });

  return () => {
    if (original) Object.defineProperty(window, key, original);
    else Reflect.deleteProperty(window, key);
  };
};

describe('FeelingsJournal voice session', () => {
  it('detaches stopped recognition and ignores a queued result', () => {
    type ResultHandler = (event: unknown) => void;
    let recognition: {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: ResultHandler | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: jest.Mock;
      stop: jest.Mock;
    } | null = null;

    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = '';
      onresult: ResultHandler | null = null;
      onerror: (() => void) | null = null;
      onend: (() => void) | null = null;
      start = jest.fn();
      stop = jest.fn();

      constructor() {
        recognition = this;
      }
    }

    const restoreRecognition = replaceWindowProperty('SpeechRecognition', MockSpeechRecognition);

    try {
      render(<FeelingsJournal ownerId="child-a" onClose={jest.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Voice' }));
      fireEvent.click(screen.getByRole('button', { name: 'Start voice note' }));

      expect(recognition).not.toBeNull();
      const stoppedRecognition = recognition!;
      const queuedResult = stoppedRecognition.onresult!;
      fireEvent.click(screen.getByRole('button', { name: 'Stop listening' }));

      expect(stoppedRecognition.stop).toHaveBeenCalledTimes(1);
      expect(stoppedRecognition.onresult).toBeNull();
      expect(stoppedRecognition.onerror).toBeNull();
      expect(stoppedRecognition.onend).toBeNull();

      act(() => {
        queuedResult({
          results: { length: 1, 0: { 0: { transcript: 'Private words from an old session' } } },
        });
      });

      expect(screen.getByRole('textbox')).toHaveValue('');
    } finally {
      restoreRecognition();
    }
  });
});
