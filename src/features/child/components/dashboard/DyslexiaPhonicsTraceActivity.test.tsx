import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { DyslexiaPhonicsSessionInput } from 'features/child/store/childProgressStore';
import DyslexiaPhonicsTraceActivity from './DyslexiaPhonicsTraceActivity';

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

describe('DyslexiaPhonicsTraceActivity', () => {
  const originalSpeechSynthesis = Object.getOwnPropertyDescriptor(window, 'speechSynthesis');
  const originalUtterance = Object.getOwnPropertyDescriptor(globalThis, 'SpeechSynthesisUtterance');
  const speak = jest.fn((utterance: MockSpeechSynthesisUtterance) => {
    utterance.onstart?.();
    utterance.onend?.();
  });

  beforeEach(() => {
    speak.mockClear();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { cancel: jest.fn(), speak },
    });
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: MockSpeechSynthesisUtterance,
    });
  });

  afterAll(() => {
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

  it('completes a non-scored hear, trace, and say loop', () => {
    const onComplete = jest.fn<void, [DyslexiaPhonicsSessionInput]>();
    render(<DyslexiaPhonicsTraceActivity onComplete={onComplete} />);

    expect(screen.getByText(/speech and handwriting are never scored/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save phonics practice' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Hear mmm' }));
    expect(speak).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'The sound is mmm. Mmm as in moon.',
        rate: 0.75,
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show mouth cue' }));
    fireEvent.click(screen.getByRole('button', { name: 'My trace is ready' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show word chunks' }));
    fireEvent.click(screen.getByRole('button', { name: 'I said mmm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Complete m mission' }));

    expect(screen.getByText('1/4 sounds')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Phonics mission progress' })).toHaveAttribute(
      'aria-valuenow',
      '25',
    );

    fireEvent.click(screen.getByRole('button', { name: '🤝 I need help' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save phonics practice' }));

    expect(onComplete).toHaveBeenCalledWith({
      completedSoundIds: ['m-moon'],
      completedSounds: ['mmm'],
      wordsPractised: ['moon'],
      totalSounds: 4,
      listenCount: 1,
      confidence: 'need-help',
      supportsUsed: expect.arrayContaining([
        'sound playback',
        'letter tracing',
        'say-it-yourself check',
        'mouth cue',
        'word chunks',
        'help requested',
      ]),
    });
  });

  it('keeps a sound mission locked until all three steps are checked', () => {
    render(<DyslexiaPhonicsTraceActivity onComplete={jest.fn()} />);

    const completeButton = screen.getByRole('button', { name: 'Complete m mission' });
    expect(completeButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Hear mmm' }));
    fireEvent.click(screen.getByRole('button', { name: 'My trace is ready' }));
    expect(completeButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'I said mmm' }));
    expect(completeButton).toBeEnabled();
  });

  it('offers an accessible trace completion path and clears the trace state', () => {
    render(<DyslexiaPhonicsTraceActivity onComplete={jest.fn()} />);

    expect(screen.getByRole('img', { name: 'Tracing pad for lowercase m' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'My trace is ready' }));
    expect(screen.getByLabelText('Tracing step complete')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear trace' }));
    expect(screen.queryByLabelText('Tracing step complete')).not.toBeInTheDocument();
  });

  it('accepts a finger or pointer stroke as a completed trace', () => {
    render(<DyslexiaPhonicsTraceActivity onComplete={jest.fn()} />);

    const tracePad = screen.getByRole('img', { name: 'Tracing pad for lowercase m' });
    fireEvent.pointerDown(tracePad, { pointerId: 1, clientX: 30, clientY: 30 });
    fireEvent.pointerMove(tracePad, { pointerId: 1, clientX: 40, clientY: 55 });
    fireEvent.pointerMove(tracePad, { pointerId: 1, clientX: 50, clientY: 80 });
    fireEvent.pointerMove(tracePad, { pointerId: 1, clientX: 65, clientY: 105 });
    fireEvent.pointerMove(tracePad, { pointerId: 1, clientX: 80, clientY: 130 });
    fireEvent.pointerUp(tracePad, { pointerId: 1, clientX: 80, clientY: 130 });

    expect(screen.getByLabelText('Tracing step complete')).toBeInTheDocument();
  });
});
