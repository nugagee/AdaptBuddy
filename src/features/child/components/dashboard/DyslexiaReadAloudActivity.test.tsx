import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { DyslexiaReadingSessionInput } from 'features/child/store/childProgressStore';
import DyslexiaReadAloudActivity from './DyslexiaReadAloudActivity';

class MockSpeechSynthesisUtterance {
  text: string;
  lang = '';
  rate = 1;
  pitch = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

describe('DyslexiaReadAloudActivity', () => {
  const originalSpeechSynthesis = Object.getOwnPropertyDescriptor(window, 'speechSynthesis');
  const originalUtterance = Object.getOwnPropertyDescriptor(globalThis, 'SpeechSynthesisUtterance');

  afterEach(() => {
    if (originalSpeechSynthesis) {
      Object.defineProperty(window, 'speechSynthesis', originalSpeechSynthesis);
    } else {
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
    }
    if (originalUtterance) {
      Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', originalUtterance);
    } else {
      Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', { configurable: true, value: undefined });
    }
  });

  it('highlights and completes sentences as queued speech finishes', () => {
    const speak = jest.fn((utterance: MockSpeechSynthesisUtterance) => {
      utterance.onstart?.();
      utterance.onend?.();
    });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { cancel: jest.fn(), speak },
    });
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: MockSpeechSynthesisUtterance,
    });
    const onComplete = jest.fn<void, [DyslexiaReadingSessionInput]>();
    render(<DyslexiaReadAloudActivity onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Gentle 0.7x' }));
    fireEvent.click(screen.getByRole('button', { name: 'Repeat word stepped' }));
    fireEvent.click(screen.getByRole('button', { name: 'Listen from sentence 1' }));

    expect(speak).toHaveBeenCalledTimes(5);
    expect(speak.mock.calls[0][0]).toEqual(expect.objectContaining({ text: 'stepped', rate: 0.7 }));
    expect(screen.getByText('4/4 sentences')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Reading progress' })).toHaveAttribute('aria-valuenow', '100');

    fireEvent.click(screen.getByRole('button', { name: 'Finish reading adventure' }));
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        passageId: 'moon-garden',
        passageTitle: 'The Moon Garden',
        sentencesCompleted: 4,
        totalSentences: 4,
        speechRate: 0.7,
        supportsUsed: expect.arrayContaining([
          'read aloud',
          'word repeat',
          'cream overlay',
          'wide line spacing',
          'clear font',
        ]),
      }),
    );
    expect(onComplete.mock.calls[0][0].wordsRead).toBeGreaterThan(20);
  });

  it('supports manual sentence progress when browser speech is unavailable', () => {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', { configurable: true, value: undefined });
    const onComplete = jest.fn<void, [DyslexiaReadingSessionInput]>();
    render(<DyslexiaReadAloudActivity onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Listen from sentence 1' }));
    expect(screen.getByText(/read-aloud is not available/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mark sentence complete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save partial reading' }));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        sentencesCompleted: 1,
        totalSentences: 4,
        wordsRead: 7,
        supportsUsed: expect.not.arrayContaining(['read aloud']),
      }),
    );
  });

  it('resets progress when a different passage is chosen', () => {
    render(<DyslexiaReadAloudActivity onComplete={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Mark sentence complete' }));
    expect(screen.getByText('1/4 sentences')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^The Brave Little Boat/i }));

    expect(screen.getByText('0/4 sentences')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The Brave Little Boat' })).toBeInTheDocument();
  });
});
