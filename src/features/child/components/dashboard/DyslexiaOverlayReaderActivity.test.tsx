import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type {
  DyslexiaReaderPreferencesInput,
  DyslexiaReadingSessionInput,
} from 'features/child/store/childProgressStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import DyslexiaOverlayReaderActivity from './DyslexiaOverlayReaderActivity';

describe('DyslexiaOverlayReaderActivity', () => {
  beforeEach(() => {
    prepareReadyChildScope();
    useChildProgressStore.setState({ dyslexiaReaderPreferences: null });
  });

  afterEach(clearReadyChildScope);

  it('saves partial reading progress with the chosen comfort setup', () => {
    const onComplete = jest.fn<
      void,
      [DyslexiaReadingSessionInput, DyslexiaReaderPreferencesInput]
    >();
    render(<DyslexiaOverlayReaderActivity onComplete={onComplete} />);

    expect(screen.getByText(/personal preference, not a test or treatment/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Blue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Extra large' }));
    fireEvent.click(screen.getByRole('button', { name: 'Extra wide' }));
    fireEvent.click(screen.getByRole('button', { name: 'Narrow' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dyslexia-friendly font' }));
    fireEvent.click(screen.getByRole('button', { name: 'I read this line' }));
    fireEvent.click(screen.getByRole('button', { name: '😊 Comfortable' }));

    expect(screen.getByText('1/4 lines')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Overlay reading progress' })).toHaveAttribute(
      'aria-valuenow',
      '25',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save partial overlay reading' }));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        activityId: 'dyslexia-overlay-read',
        passageId: 'moon-garden',
        sentencesCompleted: 1,
        totalSentences: 4,
        wordsRead: 7,
        comfortRating: 'comfortable',
        supportsUsed: expect.arrayContaining([
          'blue overlay',
          'extra large text',
          'extra wide line spacing',
          'narrow reading column',
          'reading ruler',
          'dyslexia-friendly font',
        ]),
      }),
      {
        overlay: 'blue',
        textSize: 'extra-large',
        lineSpacing: 'extra-wide',
        lineWidth: 'narrow',
        readingRuler: true,
        dyslexiaFont: true,
      },
    );
  });

  it('starts with the saved comfort setup', () => {
    useChildProgressStore.setState({
      dyslexiaReaderPreferences: {
        overlay: 'mint',
        textSize: 'medium',
        lineSpacing: 'comfortable',
        lineWidth: 'wide',
        readingRuler: false,
        dyslexiaFont: true,
        updatedAt: '2026-09-02T09:00:00.000Z',
      },
    });

    render(<DyslexiaOverlayReaderActivity onComplete={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Mint' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('group', { name: 'Text size' })).getByRole('button', { name: 'Medium' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('group', { name: 'Line spacing' })).getByRole('button', { name: 'Comfortable' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('group', { name: 'Reading column' })).getByRole('button', { name: 'Wide' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Reading ruler' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Dyslexia-friendly font' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('clears progress when a different passage is selected', () => {
    render(<DyslexiaOverlayReaderActivity onComplete={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'I read this line' }));
    expect(screen.getByText('1/4 lines')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^The Brave Little Boat/i }));

    expect(screen.getByText('0/4 lines')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The Brave Little Boat' })).toBeInTheDocument();
  });
});
