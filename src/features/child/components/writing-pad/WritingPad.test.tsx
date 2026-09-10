import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import WritingPad from './WritingPad';
import { getWritingPadStorageKey } from './writingPadHelpers';

const mockUseAuth = jest.fn();

jest.mock('hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('features/child/components/layout/ChildDashboardNavbar', () => () => (
  <div data-testid="child-navbar" />
));

const childAuth = (id: string) => ({
  user: { id },
  profile: {
    id,
    role: 'child',
    first_name: 'Child',
    neuro_types: [],
  },
});

const replaceWindowProperty = (key: string, value: unknown) => {
  const original = Object.getOwnPropertyDescriptor(window, key);
  Object.defineProperty(window, key, { configurable: true, value });

  return () => {
    if (original) Object.defineProperty(window, key, original);
    else Reflect.deleteProperty(window, key);
  };
};

describe('WritingPad draft ownership', () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseAuth.mockReset();
  });

  it('stays blank and read-only without a matching authenticated child', () => {
    localStorage.setItem('adaptbuddy-writing-pad-save', 'legacy private draft');
    mockUseAuth.mockReturnValue({ user: null, profile: null });
    const onSave = jest.fn();

    render(
      <WritingPad
        initialContent="must not be shown"
        initialContentOwnerId="child-a"
        onSave={onSave}
      />,
    );

    const writingArea = screen.getByRole('textbox', { name: 'Writing area' });
    expect(writingArea).toHaveValue('');
    expect(writingArea).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    fireEvent.change(writingArea, { target: { value: 'must not be kept' } });
    expect(writingArea).toHaveValue('');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('loads only the current authenticated child draft', () => {
    localStorage.setItem(getWritingPadStorageKey('child-a')!, 'A private draft');
    localStorage.setItem(getWritingPadStorageKey('child-b')!, 'B private draft');
    mockUseAuth.mockReturnValue(childAuth('child-a'));

    const { rerender } = render(<WritingPad />);
    expect(screen.getByRole('textbox', { name: 'Writing area' })).toHaveValue('A private draft');

    mockUseAuth.mockReturnValue(childAuth('child-b'));
    rerender(<WritingPad />);

    expect(screen.getByRole('textbox', { name: 'Writing area' })).toHaveValue('B private draft');
  });

  it('replaces an unsaved previous-child draft when the account changes', () => {
    mockUseAuth.mockReturnValue(childAuth('child-a'));
    const { rerender } = render(<WritingPad />);
    const writingArea = screen.getByRole('textbox', { name: 'Writing area' });

    fireEvent.change(writingArea, { target: { value: 'A unsaved private draft' } });
    expect(writingArea).toHaveValue('A unsaved private draft');

    mockUseAuth.mockReturnValue(childAuth('child-b'));
    rerender(<WritingPad />);

    expect(screen.getByRole('textbox', { name: 'Writing area' })).toHaveValue('');
  });

  it('shows supplied content only when its owner matches the signed-in child', () => {
    mockUseAuth.mockReturnValue(childAuth('child-b'));
    const { rerender } = render(
      <WritingPad initialContent="A private draft" initialContentOwnerId="child-a" />,
    );

    expect(screen.getByRole('textbox', { name: 'Writing area' })).toHaveValue('');

    rerender(<WritingPad initialContent="B private draft" initialContentOwnerId="child-b" />);
    expect(screen.getByRole('textbox', { name: 'Writing area' })).toHaveValue('B private draft');
  });

  it('cancels a private read-aloud when the child changes and when the pad unmounts', () => {
    const cancel = jest.fn();
    const speak = jest.fn();
    const restoreSpeechSynthesis = replaceWindowProperty('speechSynthesis', { cancel, speak });
    const restoreUtterance = replaceWindowProperty(
      'SpeechSynthesisUtterance',
      class MockSpeechSynthesisUtterance {
        rate = 1;

        constructor(readonly text: string) {}
      },
    );

    try {
      localStorage.setItem(getWritingPadStorageKey('child-a')!, 'A private draft');
      localStorage.setItem(getWritingPadStorageKey('child-b')!, 'B private draft');
      mockUseAuth.mockReturnValue(childAuth('child-a'));
      const { rerender, unmount } = render(<WritingPad />);

      cancel.mockClear();
      fireEvent.click(screen.getByRole('button', { name: 'Listen' }));
      expect(speak).toHaveBeenCalledTimes(1);

      cancel.mockClear();
      mockUseAuth.mockReturnValue(childAuth('child-b'));
      rerender(<WritingPad />);
      expect(cancel).toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Listen' }));
      expect(speak).toHaveBeenCalledTimes(2);

      cancel.mockClear();
      unmount();
      expect(cancel).toHaveBeenCalledTimes(1);
    } finally {
      restoreUtterance();
      restoreSpeechSynthesis();
    }
  });

  it('detaches recognition on child change and unmount, ignoring queued results', () => {
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
      abort: jest.Mock;
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
      abort = jest.fn();

      constructor() {
        recognition = this;
      }
    }

    const restoreRecognition = replaceWindowProperty('SpeechRecognition', MockSpeechRecognition);

    try {
      mockUseAuth.mockReturnValue(childAuth('child-a'));
      const { rerender, unmount } = render(<WritingPad />);
      fireEvent.click(screen.getByRole('button', { name: 'Voice type' }));

      expect(recognition).not.toBeNull();
      const childARecognition = recognition!;
      const queuedResult = childARecognition.onresult!;
      expect(childARecognition.start).toHaveBeenCalledTimes(1);

      mockUseAuth.mockReturnValue(childAuth('child-b'));
      rerender(<WritingPad />);

      expect(childARecognition.abort).toHaveBeenCalledTimes(1);
      expect(childARecognition.onresult).toBeNull();
      expect(childARecognition.onerror).toBeNull();
      expect(childARecognition.onend).toBeNull();

      act(() => {
        queuedResult({
          results: { length: 1, 0: { 0: { transcript: 'Child A private words' } } },
        });
      });
      expect(screen.getByRole('textbox', { name: 'Writing area' })).toHaveValue('');

      fireEvent.click(screen.getByRole('button', { name: 'Voice type' }));
      const childBRecognition = recognition!;
      expect(childBRecognition).not.toBe(childARecognition);
      unmount();
      expect(childBRecognition.abort).toHaveBeenCalledTimes(1);
      expect(childBRecognition.onresult).toBeNull();
      expect(childBRecognition.onerror).toBeNull();
      expect(childBRecognition.onend).toBeNull();
    } finally {
      restoreRecognition();
    }
  });
});
