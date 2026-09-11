import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from 'store/authStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import { installPronunciationMediaMock } from 'testUtils/pronunciationMediaMock';
import { DEFAULT_PRONUNCIATION_ITEMS } from '../data/pronunciationPractice';
import PronunciationBuddyPage, { buildFeedback, buildWeeklySummaryText, getPracticeScoreLabel, getPronunciationStorageKey, scorePronunciation } from './PronunciationBuddyPage';
jest.mock('hooks/useAuth', () => { const { useAuthStore: store } = jest.requireActual('store/authStore'); return { useAuth: () => store() }; });
jest.mock('features/child/components/layout/ChildDashboardNavbar', () => () => null);
let browser: ReturnType<typeof installPronunciationMediaMock>;
beforeEach(() => { localStorage.clear(); browser = installPronunciationMediaMock(); prepareReadyChildScope('child-a', ['autism']); });
afterEach(() => { cleanup(); clearReadyChildScope(); browser.restore(); jest.restoreAllMocks(); });
const show = () => render(<MemoryRouter><PronunciationBuddyPage /></MemoryRouter>);
const item = DEFAULT_PRONUNCIATION_ITEMS.find(value => value.id === 'hello')!;

test.each([['confident', 88], ['practised', 72], ['hard', 52]] as const)('the existing %s encouragement score stays at %d', (confidence, score) => {
  expect(buildFeedback(item, item.phrase, 'self_checked', confidence).score).toBe(score);
});
test('the support check-in value and browser matching formula are retained', () => {
  expect(buildFeedback(item, '', 'support_needed').score).toBe(30); expect(scorePronunciation('hello', 'hello')).toBe(100);
  expect(scorePronunciation('m', 'em')).toBe(96); expect(scorePronunciation('hello', '')).toBe(0); expect(scorePronunciation('hello', 'hallo')).toBe(80);
});
test('score sources are named honestly without removing numeric scores', () => {
  expect(getPracticeScoreLabel('self_checked')).toBe('Self-check encouragement score'); expect(getPracticeScoreLabel('microphone')).toBe('Browser word-match score');
  show(); fireEvent.click(screen.getByRole('button', { name: 'I said it myself' })); expect(screen.getAllByText(/72%/).length).toBeGreaterThan(0); expect(screen.getByText('Self-check encouragement score')).toBeInTheDocument();
});
test('legacy history retains score numbers while no new voice permission is inherited', () => {
  localStorage.setItem(getPronunciationStorageKey('child-a', 'attempts'), JSON.stringify([{ id: 'old', itemId: 'hello', phrase: 'hello', heard: 'redact this', score: 88, tone: 'great', mode: 'self_checked', confidence: 'confident', supportUsed: [], createdAt: new Date().toISOString() }]));
  localStorage.setItem(getPronunciationStorageKey('child-a', 'mic-consent'), 'yes'); show();
  expect(screen.getAllByText(/88%/).length).toBeGreaterThan(0); expect(screen.getByRole('button', { name: 'Use mic' })).toBeDisabled();
  expect(JSON.parse(localStorage.getItem(getPronunciationStorageKey('child-a', 'attempts'))!)[0].score).toBe(88);
});
test('a new failed browser attempt leaves the previous score and history unchanged', () => {
  show(); fireEvent.click(screen.getByRole('button', { name: 'I said it myself' })); const key = getPronunciationStorageKey('child-a', 'attempts'); const before = localStorage.getItem(key);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Allow browser speech checking for this visit' })); fireEvent.click(screen.getByRole('button', { name: 'Use mic' }));
  act(() => { browser.recognition().onerror?.({ error: 'no-speech' }); }); expect(localStorage.getItem(key)).toBe(before);
});
test('a successful word check uses existing scoring and never persists the raw recognised sentence', () => {
  show(); fireEvent.click(screen.getByRole('checkbox', { name: 'Allow browser speech checking for this visit' })); fireEvent.click(screen.getByRole('button', { name: 'Use mic' }));
  act(() => { browser.recognition().onresult?.({ results: [{ isFinal: true, 0: { transcript: item.phrase } }] }); browser.recognition().onend?.(); });
  const record = JSON.parse(localStorage.getItem(getPronunciationStorageKey('child-a', 'attempts'))!)[0];
  expect(record.score).toBe(100); expect(record.heard).toBe('Microphone practice completed'); expect(record.mode).toBe('microphone');
});
test('temporary record-and-replay is genuinely available on the real page without adding automatic scores', async () => {
  show(); fireEvent.click(screen.getByRole('checkbox', { name: 'Allow temporary recording for this visit' }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Record my try' })); await Promise.resolve(); });
  fireEvent.click(screen.getByRole('button', { name: 'Stop recording' })); fireEvent.click(screen.getByRole('button', { name: 'Hear my recording' }));
  expect(browser.player().play).toHaveBeenCalled(); expect(localStorage.getItem(getPronunciationStorageKey('child-a', 'attempts'))).toBeNull();
});
test('real-page shortcuts play examples, open controls, focus words and preserve existing scores on retry', () => {
  show(); const shortcuts = within(screen.getByRole('region', { name: 'Practice shortcuts' })); fireEvent.click(shortcuts.getByRole('button', { name: 'Hear it' })); expect(browser.synth.speak).toHaveBeenCalled();
  fireEvent.click(shortcuts.getByRole('button', { name: 'Say it' })); expect(screen.getByRole('heading', { name: 'Hear, record and practise' })).toHaveFocus();
  fireEvent.click(shortcuts.getByRole('button', { name: 'Keep words' })); expect(screen.getByRole('textbox', { name: 'New practice word or sentence' })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'I said it myself' })); const key = getPronunciationStorageKey('child-a', 'attempts'); const before = localStorage.getItem(key);
  fireEvent.click(shortcuts.getByRole('button', { name: 'Try again' })); expect(localStorage.getItem(key)).toBe(before);
});
test('summary retains numbers and explains that score sources are not clinical accuracy', () => {
  const summary = buildWeeklySummaryText([{ id: 'x', itemId: 'hello', phrase: 'hello', heard: 'Self-checked practice', score: 88, tone: 'great', mode: 'self_checked', confidence: 'confident', supportUsed: [], createdAt: new Date().toISOString() }], 'Test');
  expect(summary).toContain('88%'); expect(summary).toContain('Self-checks: 1'); expect(summary).toContain('preset encouragement'); expect(summary).toContain('not a pronunciation assessment');
});
test('guest recording and score history remain transient on the real page', async () => {
  prepareReadyChildScope('guest-child', ['autism']); useAuthStore.setState({ user: null, isGuest: true }); show(); fireEvent.click(screen.getByRole('checkbox', { name: 'Allow temporary recording for this visit' }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Record my try' })); await Promise.resolve(); }); fireEvent.click(screen.getByRole('button', { name: 'Stop recording' })); fireEvent.click(screen.getByRole('button', { name: 'I said it myself' }));
  expect(Object.keys(localStorage).filter(key => key.startsWith('adaptbuddy-pronunciation-'))).toEqual([]);
});
