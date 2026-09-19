import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import SpeechLanguageActivity from './SpeechLanguageActivity';
import type { SpeechLanguageActivityId } from './speechLanguageContent';

const PHRASES: SpeechLanguageActivityId = 'speech-language-phrase-cards';
const SENTENCE: SpeechLanguageActivityId = 'speech-language-sentence-builder';
const STORY: SpeechLanguageActivityId = 'speech-language-story-steps';
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const phrasePractice = () => { click('Please show me one step.'); click('I pointed to the card'); };
const sentenceChoices = () => { click('I'); click('read'); click('at home.'); };

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-10T10:00:00Z'));
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  prepareReadyChildScope('child-a', ['speech-language']);
});
afterEach(() => {
  cleanup(); clearReadyChildScope(); jest.useRealTimers();
  Reflect.deleteProperty(document, 'hidden');
});

describe('Helpful Phrase Cards', () => {
  it('requires a chosen phrase and a practice acknowledgement', () => {
    const done = jest.fn();
    render(<SpeechLanguageActivity activityId={PHRASES} onComplete={done} />);
    expect(screen.getByRole('button', { name: 'I pointed to the card' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Record phrase practice' })).toBeDisabled();
    click('Please show me one step.');
    expect(screen.getByRole('button', { name: 'Record phrase practice' })).toBeDisabled();
    click('I pointed to the card');
    click('Record phrase practice');
    expect(done).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith({ durationMinutes: 0 });
  });

  it.each(['I pointed to the card', 'I read the card', 'I said it my way'])('accepts %s without a microphone or raw-content payload', (method) => {
    const done = jest.fn();
    render(<SpeechLanguageActivity activityId={PHRASES} onComplete={done} />);
    expect(screen.getByText(/No microphone is used/)).toBeInTheDocument();
    expect(screen.getByText(/does not send a message or contact anyone/)).toBeInTheDocument();
    click('Please show me one step.'); click(method);
    act(() => { jest.advanceTimersByTime(12000); });
    click('Record phrase practice');
    expect(done).toHaveBeenCalledWith({ durationMinutes: 0.2 });
    expect(Object.keys(done.mock.calls[0][0])).toEqual(['durationMinutes']);
  });

  it('clears practice when the phrase changes and clears the card when its group changes', () => {
    render(<SpeechLanguageActivity activityId={PHRASES} onComplete={jest.fn()} />);
    phrasePractice();
    click('Please say that again.');
    expect(screen.getByRole('button', { name: 'Record phrase practice' })).toBeDisabled();
    click('I read the card'); click('More time');
    expect(screen.getByRole('region', { name: 'My phrase card' })).toHaveTextContent('Choose a phrase');
    expect(screen.queryByRole('button', { name: 'Please say that again.' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record phrase practice' })).toBeDisabled();
  });

  it('supports keyboard phrase selection', async () => {
    render(<SpeechLanguageActivity activityId={PHRASES} onComplete={jest.fn()} />);
    const button = screen.getByRole('button', { name: 'Please show me one step.' });
    expect(button).toHaveClass('min-h-12');
    button.focus();
    await act(async () => { await userEvent.keyboard('{Enter}'); });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('region', { name: 'My phrase card' })).toHaveTextContent('Please show me one step.');
  });
});

describe('Sentence Builder', () => {
  it('requires all three choices and explicit exploration before recording', () => {
    const done = jest.fn();
    render(<SpeechLanguageActivity activityId={SENTENCE} onComplete={done} />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
    click('I'); click('read');
    expect(screen.getByRole('checkbox')).toBeDisabled();
    click('at home.');
    expect(screen.getByRole('region', { name: 'My sentence' })).toHaveTextContent('I read at home.');
    expect(screen.getByRole('button', { name: 'Record sentence practice' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    click('Record sentence practice');
    expect(done).toHaveBeenCalledWith({ durationMinutes: 0 });
  });

  it('invalidates the confirmation after a changed choice', () => {
    render(<SpeechLanguageActivity activityId={SENTENCE} onComplete={jest.fn()} />);
    sentenceChoices(); fireEvent.click(screen.getByRole('checkbox')); click('We');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Record sentence practice' })).toBeDisabled();
    expect(screen.getByRole('region', { name: 'My sentence' })).toHaveTextContent('We read at home.');
  });

  it('shows an example without automatically filling or completing the sentence', () => {
    render(<SpeechLanguageActivity activityId={SENTENCE} onComplete={jest.fn()} />);
    click('Show a sentence example');
    expect(screen.getByText(/One example: We draw/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'My sentence' })).toHaveTextContent('Your sentence will appear here.');
    expect(screen.getByRole('button', { name: 'Record sentence practice' })).toBeDisabled();
  });

  it('clears all choices, confirmation and example on reset', () => {
    render(<SpeechLanguageActivity activityId={SENTENCE} onComplete={jest.fn()} />);
    sentenceChoices(); fireEvent.click(screen.getByRole('checkbox')); click('Show a sentence example'); click('Clear sentence');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'I' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText(/One example: We draw/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record sentence practice' })).toBeDisabled();
  });
});

describe('Story Steps', () => {
  it('starts with three shuffled cards and disabled completion', () => {
    render(<SpeechLanguageActivity activityId={STORY} onComplete={jest.fn()} />);
    const cards = within(screen.getByRole('list', { name: 'My story order' })).getAllByRole('listitem');
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent('Sam gives the seed some water.');
    expect(screen.getByRole('button', { name: 'Move Sam gives the seed some water. up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Record story practice' })).toBeDisabled();
  });

  it('allows an explored alternative order without forcing a correct-answer score', () => {
    const done = jest.fn();
    render(<SpeechLanguageActivity activityId={STORY} onComplete={done} />);
    click('Compare with an example');
    expect(screen.getByText(/Your order is different/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record story practice' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox')); click('Record story practice');
    expect(done).toHaveBeenCalledWith({ durationMinutes: 0 });
  });

  it('moves cards with the keyboard and invalidates an old confirmation', async () => {
    render(<SpeechLanguageActivity activityId={STORY} onComplete={jest.fn()} />);
    click('Compare with an example'); fireEvent.click(screen.getByRole('checkbox'));
    const button = screen.getByRole('button', { name: 'Move Sam gives the seed some water. down' });
    button.focus();
    await act(async () => { await userEvent.keyboard('{Enter}'); });
    const cards = within(screen.getByRole('list', { name: 'My story order' })).getAllByRole('listitem');
    expect(cards[0]).toHaveTextContent('A small plant grows.');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.queryByRole('region', { name: 'One example order' })).not.toBeInTheDocument();
  });

  it('provides one-step navigation without automatically completing anything', () => {
    render(<SpeechLanguageActivity activityId={STORY} onComplete={jest.fn()} />);
    click('Show one step at a time');
    expect(within(screen.getByRole('list', { name: 'My story order' })).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Previous story step' })).toBeDisabled();
    click('Next story step');
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record story practice' })).toBeDisabled();
  });

  it('starts a changed story cleanly', () => {
    render(<SpeechLanguageActivity activityId={STORY} onComplete={jest.fn()} />);
    click('Compare with an example'); fireEvent.click(screen.getByRole('checkbox')); click('Show one step at a time');
    fireEvent.change(screen.getByRole('combobox', { name: 'Story' }), { target: { value: '1' } });
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(within(screen.getByRole('list', { name: 'My story order' })).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.queryByText(/Sam gives/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record story practice' })).toBeDisabled();
  });
});

describe('Session privacy and time', () => {
  it('keeps choices during a pause but excludes paused time', () => {
    const done = jest.fn();
    render(<SpeechLanguageActivity activityId={PHRASES} onComplete={done} />);
    phrasePractice(); act(() => { jest.advanceTimersByTime(10000); }); click('Pause practice');
    expect(screen.queryByRole('button', { name: 'Record phrase practice' })).not.toBeInTheDocument();
    act(() => { jest.advanceTimersByTime(60000); }); click('Continue practice');
    expect(screen.getByRole('region', { name: 'My phrase card' })).toHaveTextContent('Please show me one step.');
    act(() => { jest.advanceTimersByTime(10000); }); click('Record phrase practice');
    expect(done.mock.calls[0][0].durationMinutes).toBeCloseTo(20 / 60);
  });

  it('excludes time while the document is hidden', () => {
    const done = jest.fn();
    render(<SpeechLanguageActivity activityId={PHRASES} onComplete={done} />);
    phrasePractice(); act(() => { jest.advanceTimersByTime(10000); });
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    fireEvent(document, new Event('visibilitychange'));
    act(() => { jest.advanceTimersByTime(60000); });
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    fireEvent(document, new Event('visibilitychange'));
    act(() => { jest.advanceTimersByTime(10000); }); click('Record phrase practice');
    expect(done.mock.calls[0][0].durationMinutes).toBeCloseTo(20 / 60);
  });

  it('records only once and never awards just for waiting', () => {
    const done = jest.fn();
    render(<SpeechLanguageActivity activityId={PHRASES} onComplete={done} />);
    act(() => { jest.advanceTimersByTime(300000); });
    expect(done).not.toHaveBeenCalled(); phrasePractice();
    const finish = screen.getByRole('button', { name: 'Record phrase practice' });
    fireEvent.click(finish); fireEvent.click(finish);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('discards choices across account changes and cannot resurrect the old launch', () => {
    const done = jest.fn();
    render(<SpeechLanguageActivity activityId={PHRASES} onComplete={done} />);
    phrasePractice();
    act(() => { prepareReadyChildScope('child-b', ['speech-language']); });
    expect(screen.queryByRole('region', { name: 'My phrase card' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('session has changed');
    act(() => { prepareReadyChildScope('child-a', ['speech-language']); });
    expect(screen.queryByRole('button', { name: 'Record phrase practice' })).not.toBeInTheDocument();
    expect(done).not.toHaveBeenCalled();
  });

  it('invalidates even a batched loading-to-ready transition for the same child', () => {
    render(<SpeechLanguageActivity activityId={PHRASES} onComplete={jest.fn()} />);
    phrasePractice();
    act(() => {
      useChildProgressStore.setState({ hydrationStatus: 'loading' });
      useChildProgressStore.setState({ hydrationStatus: 'ready' });
    });
    expect(screen.getByRole('status')).toHaveTextContent('session has changed');
    expect(screen.queryByRole('button', { name: 'Record phrase practice' })).not.toBeInTheDocument();
  });

  it('rejects a profile without Speech and Language selected', () => {
    prepareReadyChildScope('child-a', ['autism']);
    render(<SpeechLanguageActivity activityId={PHRASES} onComplete={jest.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('not ready for this tool');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('fails closed when the selected support profile is removed', () => {
    const done = jest.fn();
    render(<SpeechLanguageActivity activityId={PHRASES} onComplete={done} />);
    phrasePractice();
    act(() => { useAuthStore.setState({ profile: { ...useAuthStore.getState().profile!, neuro_types: ['autism'] } }); });
    expect(screen.getByRole('status')).toHaveTextContent('session has changed');
    expect(done).not.toHaveBeenCalled();
  });

  it('does not carry a completed practice into a different activity prop', () => {
    const done = jest.fn();
    const { rerender } = render(<SpeechLanguageActivity activityId={PHRASES} onComplete={done} />);
    phrasePractice(); rerender(<SpeechLanguageActivity activityId={SENTENCE} onComplete={done} />);
    expect(screen.getByRole('status')).toHaveTextContent('session has changed');
    expect(done).not.toHaveBeenCalled();
  });

  it('rejects unknown activity IDs', () => {
    render(<SpeechLanguageActivity activityId={'speech-language-forged' as SpeechLanguageActivityId} onComplete={jest.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('not ready for this tool');
  });
});
