import React from 'react';
import { render, screen } from '@testing-library/react';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import DyslexiaReadingProgressPanel from './DyslexiaReadingProgressPanel';

describe('DyslexiaReadingProgressPanel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-02T09:30:00.000Z'));
    useChildProgressStore.setState({ dyslexiaReadingSessions: [] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows a gentle starting prompt before reading begins', () => {
    render(<DyslexiaReadingProgressPanel />);
    expect(screen.getByText(/read or listen to one sentence/i)).toBeInTheDocument();
  });

  it('summarizes today\'s reading and supports', () => {
    useChildProgressStore.getState().addDyslexiaReadingSession({
      passageId: 'moon-garden',
      passageTitle: 'The Moon Garden',
      sentencesCompleted: 4,
      totalSentences: 4,
      wordsRead: 31,
      speechRate: 0.7,
      supportsUsed: ['read aloud', 'cream overlay'],
    });

    render(<DyslexiaReadingProgressPanel />);
    expect(screen.getByRole('heading', { name: 'The Moon Garden' })).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('read aloud')).toBeInTheDocument();
    expect(screen.getByText('cream overlay')).toBeInTheDocument();
  });
});
