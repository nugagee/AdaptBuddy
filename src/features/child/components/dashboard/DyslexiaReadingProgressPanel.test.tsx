import React from 'react';
import { render, screen } from '@testing-library/react';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import DyslexiaReadingProgressPanel from './DyslexiaReadingProgressPanel';

describe('DyslexiaReadingProgressPanel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-02T09:30:00.000Z'));
    useChildProgressStore.setState({
      dyslexiaReadingSessions: [],
      dyslexiaReaderPreferences: null,
      dyslexiaPhonicsSessions: [],
    });
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

  it('shows the saved overlay reader comfort setup', () => {
    useChildProgressStore.getState().setDyslexiaReaderPreferences({
      overlay: 'mint',
      textSize: 'extra-large',
      lineSpacing: 'extra-wide',
      lineWidth: 'narrow',
      readingRuler: true,
      dyslexiaFont: true,
    });
    useChildProgressStore.getState().addDyslexiaReadingSession({
      activityId: 'dyslexia-overlay-read',
      passageId: 'brave-little-boat',
      passageTitle: 'The Brave Little Boat',
      sentencesCompleted: 2,
      totalSentences: 4,
      wordsRead: 18,
      comfortRating: 'comfortable',
      supportsUsed: ['mint overlay', 'reading ruler'],
    });

    render(<DyslexiaReadingProgressPanel />);

    expect(screen.getByText('Latest comfort reading')).toBeInTheDocument();
    expect(screen.getByText('Saved comfort setup')).toBeInTheDocument();
    expect(screen.getByText(/mint page.*extra large text.*reading ruler/i)).toBeInTheDocument();
  });

  it('shows phonics progress even before a reading session', () => {
    useChildProgressStore.getState().addDyslexiaPhonicsSession({
      completedSoundIds: ['m-moon'],
      completedSounds: ['mmm'],
      wordsPractised: ['moon'],
      totalSounds: 4,
      listenCount: 1,
      confidence: 'practised',
      supportsUsed: ['sound playback', 'letter tracing'],
    });

    render(<DyslexiaReadingProgressPanel />);

    expect(screen.getByText('Latest phonics practice')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'mmm sounds' })).toBeInTheDocument();
    const soundsCard = screen.getByText('sounds today').closest('div');
    expect(soundsCard).toHaveTextContent('1');
    expect(screen.getByText('letter tracing')).toBeInTheDocument();
  });

  it('uses timestamps to show the most recent Dyslexia activity type', () => {
    useChildProgressStore.getState().addDyslexiaReadingSession({
      activityId: 'dyslexia-read-aloud',
      passageId: 'moon-garden',
      passageTitle: 'The Moon Garden',
      sentencesCompleted: 1,
      totalSentences: 4,
      wordsRead: 7,
      speechRate: 0.9,
      supportsUsed: ['read aloud'],
    });
    jest.setSystemTime(new Date('2026-09-02T10:00:00.000Z'));
    useChildProgressStore.getState().addDyslexiaPhonicsSession({
      completedSoundIds: ['s-sun'],
      completedSounds: ['sss'],
      wordsPractised: ['sun'],
      totalSounds: 4,
      listenCount: 1,
      confidence: 'confident',
      supportsUsed: ['word chunks'],
    });

    render(<DyslexiaReadingProgressPanel />);

    expect(screen.getByText('Latest phonics practice')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'sss sounds' })).toBeInTheDocument();
    expect(screen.getByText('word chunks')).toBeInTheDocument();
  });
});
