import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import DyscalculiaPracticeActivity from './DyscalculiaPracticeActivity';
import { MATHS_PRACTICE_IDS, type MathsPracticeId } from './dyscalculiaPracticeContent';

beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-09-10T10:00:00Z'));
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  prepareReadyChildScope('child-a', ['dyscalculia']);
});
afterEach(() => { cleanup(); clearReadyChildScope(); jest.useRealTimers(); Reflect.deleteProperty(document, 'hidden'); });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const choose = (name: string, value: string) => fireEvent.change(screen.getByRole('combobox', { name }), { target: { value } });
const review = () => fireEvent.click(screen.getByRole('checkbox'));
const mount = (id: MathsPracticeId = 'dyscalculia-pattern-blocks') => {
  const done = jest.fn(); render(<DyscalculiaPracticeActivity activityId={id} onComplete={done} />); return done;
};
const fillPattern = (left = 'Circle', right = 'Square') => {
  click(`Use ${left}`); click('Missing block 2'); click(`Use ${right}`); click('Check my pattern');
};
const ready = (id: MathsPracticeId) => {
  if (id === 'dyscalculia-pattern-blocks') fillPattern();
  else { choose('My answer', '5'); click('Check my answer'); }
  review();
};
const finishLabel = (id: MathsPracticeId) => id === 'dyscalculia-pattern-blocks' ? 'Record pattern practice' : 'Record story practice';
const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
  fireEvent(document, new Event('visibilitychange'));
};

test.each(MATHS_PRACTICE_IDS)('%s cannot complete merely by opening, waiting or requesting a hint', id => {
  const done = mount(id);
  click(id === 'dyscalculia-pattern-blocks' ? 'Show pattern hint' : 'Show story hint');
  act(() => { jest.advanceTimersByTime(900000); });
  expect(screen.getByRole('checkbox')).toBeDisabled();
  expect(screen.getByRole('button', { name: finishLabel(id) })).toBeDisabled();
  expect(done).not.toHaveBeenCalled();
});

test.each([
  ['0', 'Circle', 'Square'], ['1', 'Circle', 'Circle'], ['2', '5 counters', '6 counters'],
])('pattern example %s gives truthful positive feedback after its actual choices', (index, left, right) => {
  const done = mount(); choose('Pattern example', index); fillPattern(left, right);
  expect(screen.getByRole('status', { name: 'Pattern feedback' })).toHaveTextContent('Your blocks continue this example.');
  expect(done).not.toHaveBeenCalled(); review(); click('Record pattern practice');
  expect(done).toHaveBeenCalledWith({ durationMinutes: 0 });
});

test('a different pattern receives worked feedback and equal practice credit, not a false correct claim', () => {
  const done = mount(); fillPattern('Triangle', 'Triangle');
  const feedback = screen.getByRole('status', { name: 'Pattern feedback' });
  expect(feedback).toHaveTextContent('Your blocks make a different pattern.');
  expect(feedback).toHaveTextContent('The next two blocks are Circle, Square.');
  expect(feedback).not.toHaveTextContent('Your blocks continue this example.');
  review(); click('Record pattern practice'); expect(done).toHaveBeenCalledWith({ durationMinutes: 0 });
});

test('one pattern choice cannot unlock checking or the review checkbox', () => {
  mount(); click('Use Circle'); expect(screen.getByRole('button', { name: 'Check my pattern' })).toBeDisabled();
  expect(screen.getByRole('checkbox')).toBeDisabled();
});

test('editing a checked block clears feedback and its review while merely selecting the slot does not', () => {
  mount(); fillPattern(); review(); click('Missing block 1');
  expect(screen.getByRole('checkbox')).toBeChecked(); click('Use Triangle');
  expect(screen.queryByRole('status', { name: 'Pattern feedback' })).not.toBeInTheDocument();
  expect(screen.getByRole('checkbox')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Record pattern practice' })).toBeDisabled();
});

test.each(['reset', 'example'])('%s clears pattern choices and stale review', mode => {
  mount(); fillPattern(); review();
  if (mode === 'reset') click('Reset this pattern'); else choose('Pattern example', '2');
  expect(screen.getAllByText('Not chosen yet')).toHaveLength(2);
  expect(screen.getByRole('checkbox')).not.toBeChecked(); expect(screen.getByRole('checkbox')).toBeDisabled();
});

test('labelled blocks and keyboard activation work without colour matching or dragging', async () => {
  const done = mount();
  expect(within(screen.getByRole('region', { name: 'Pattern to explore' })).getAllByText('Circle')).toHaveLength(2);
  screen.getByRole('button', { name: 'Use Circle' }).focus();
  await act(async () => { await userEvent.keyboard('{Enter}'); });
  click('Missing block 2'); click('Use Square'); click('Check my pattern');
  screen.getByRole('checkbox').focus(); await act(async () => { await userEvent.keyboard(' '); });
  screen.getByRole('button', { name: 'Record pattern practice' }).focus();
  await act(async () => { await userEvent.keyboard('{Enter}'); }); expect(done).toHaveBeenCalledTimes(1);
});

test.each([['0', '5', '2 + 3 = 5 cups.'], ['1', '4', '6 − 2 = 4 fruit pieces.'], ['2', '3', '1 + 2 = 3 equal measures.']])('story %s has correct arithmetic and meaningful units', (index, answer, equation) => {
  const done = mount('dyscalculia-real-world'); choose('Maths story', index);
  choose('My answer', answer); click('Check my answer');
  const feedback = screen.getByRole('status', { name: 'Story feedback' });
  expect(feedback).toHaveTextContent('Your quantity matches this story.'); expect(feedback).toHaveTextContent(equation);
  expect(done).not.toHaveBeenCalled(); review(); click('Record story practice'); expect(done).toHaveBeenCalledWith({ durationMinutes: 0 });
});

test('zero is a valid quantity to compare, but is not falsely called correct', () => {
  const done = mount('dyscalculia-real-world'); choose('My answer', '0'); click('Check my answer');
  const feedback = screen.getByRole('status', { name: 'Story feedback' });
  expect(feedback).toHaveTextContent('This story works out to a different quantity.');
  expect(feedback).toHaveTextContent('You chose 0 cups.');
  review(); click('Record story practice'); expect(done).toHaveBeenCalledWith({ durationMinutes: 0 });
});

test('model controls are bounded, support empty quantities and allow a concrete answer without typing', () => {
  mount('dyscalculia-real-world');
  click('Remove one'); click('Remove one');
  expect(screen.getByRole('button', { name: 'Remove one' })).toBeDisabled();
  expect(screen.getByRole('img', { name: 'Model shows 0 cups' })).toBeInTheDocument();
  click('Use my model as my answer'); expect(screen.getByRole('combobox', { name: 'My answer' })).toHaveValue('0');
  for (let i = 0; i < 8; i += 1) click('Add one');
  expect(screen.getByRole('button', { name: 'Add one' })).toBeDisabled();
  expect(screen.getByRole('img', { name: 'Model shows 8 cups' })).toBeInTheDocument();
});

test('adding or removing from the counting model invalidates a previous answer and review', () => {
  mount('dyscalculia-real-world'); choose('My answer', '5'); click('Check my answer'); review(); click('Add one');
  expect(screen.getByRole('combobox', { name: 'My answer' })).toHaveValue('');
  expect(screen.queryByRole('status', { name: 'Story feedback' })).not.toBeInTheDocument();
  expect(screen.getByRole('checkbox')).toBeDisabled();
});

test('changing the answer requires fresh checking and review', () => {
  mount('dyscalculia-real-world'); ready('dyscalculia-real-world'); choose('My answer', '4');
  expect(screen.getByRole('checkbox')).not.toBeChecked(); expect(screen.getByRole('checkbox')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Record story practice' })).toBeDisabled();
});

test('the equal-measure model has four fixed same-sized units, not ambiguous recipe quantities', () => {
  mount('dyscalculia-real-world'); choose('Maths story', '2');
  const jug = screen.getByRole('img', { name: 'Pretend jug: 1 of 4 equal measures filled' });
  expect(within(jug).getAllByText('1 measure')).toHaveLength(4);
  click('Add one'); click('Add one'); click('Add one');
  expect(screen.getByRole('button', { name: 'Add one' })).toBeDisabled();
  expect(screen.getByText(/not millilitres or a real recipe/)).toBeInTheDocument();
});

test('one-step story view retains controls and has bounded navigation', () => {
  mount('dyscalculia-real-world'); click('Show one story step');
  expect(screen.getByRole('button', { name: 'Previous story step' })).toBeDisabled();
  expect(screen.getByText('Story step 1 of 3')).toBeInTheDocument();
  click('Next story step'); click('Next story step');
  expect(screen.getByRole('button', { name: 'Next story step' })).toBeDisabled();
  expect(screen.getByRole('combobox', { name: 'My answer' })).toBeEnabled(); click('Show the whole story');
  expect(within(screen.getByRole('region', { name: 'Story instructions' })).getAllByRole('listitem')).toHaveLength(3);
});

test.each(['reset', 'story'])('%s clears old story choices, model, hint and review', mode => {
  mount('dyscalculia-real-world'); ready('dyscalculia-real-world'); click('Show one story step'); click('Show story hint');
  if (mode === 'reset') click('Reset this story'); else choose('Maths story', '1');
  expect(screen.getByRole('combobox', { name: 'My answer' })).toHaveValue('');
  expect(screen.getByRole('checkbox')).toBeDisabled(); expect(screen.getByRole('button', { name: 'Show story hint' })).toHaveAttribute('aria-expanded', 'false');
  expect(screen.getByRole('button', { name: 'Show one story step' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('img', { name: mode === 'reset' ? 'Model shows 2 cups' : 'Model shows 6 fruit pieces' })).toBeInTheDocument();
});

test.each(MATHS_PRACTICE_IDS)('%s records only visible unpaused time and excludes answers from its once-only callback', id => {
  const done = mount(id); ready(id); act(() => { jest.advanceTimersByTime(6000); });
  click('Pause maths practice'); act(() => { jest.advanceTimersByTime(60000); });
  expect(screen.queryByRole('button', { name: finishLabel(id) })).not.toBeInTheDocument();
  click('Continue maths practice'); expect(screen.getByRole('checkbox')).toBeChecked();
  act(() => { jest.advanceTimersByTime(6000); }); setHidden(true); act(() => { jest.advanceTimersByTime(120000); }); setHidden(false);
  const finish = screen.getByRole('button', { name: finishLabel(id) }); fireEvent.click(finish); fireEvent.click(finish);
  expect(done).toHaveBeenCalledTimes(1); expect(done).toHaveBeenCalledWith({ durationMinutes: 0.2 });
});

test.each(MATHS_PRACTICE_IDS)('%s rejects completion while the page is hidden', id => {
  const done = mount(id); ready(id); const finish = screen.getByRole('button', { name: finishLabel(id) });
  setHidden(true); fireEvent.click(finish); expect(done).not.toHaveBeenCalled();
  setHidden(false); fireEvent.click(finish); expect(done).toHaveBeenCalledTimes(1);
});

test.each(MATHS_PRACTICE_IDS)('%s guest choices and hints are not written to persistent storage', id => {
  prepareReadyChildScope('guest-child', ['dyscalculia']); useAuthStore.setState({ user: null, isGuest: true });
  const before = { ...localStorage }; const done = mount(id); ready(id); click(finishLabel(id));
  expect(done).toHaveBeenCalledWith({ durationMinutes: 0 }); expect({ ...localStorage }).toEqual(before);
});

test.each(['owner', 'loading', 'profile'])('invalid %s cannot open a maths exercise', failure => {
  if (failure === 'owner') useChildProgressStore.setState({ ownerId: 'child-b' });
  if (failure === 'loading') useChildProgressStore.setState({ hydrationStatus: 'loading' });
  if (failure === 'profile') useAuthStore.setState({ profile: { ...useAuthStore.getState().profile!, neuro_types: ['adhd'] } });
  const done = mount(); expect(screen.getByRole('status')).toHaveTextContent('original child session');
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument(); expect(done).not.toHaveBeenCalled();
});

test.each(MATHS_PRACTICE_IDS)('%s invalidates stale controls after an account switch', id => {
  const done = mount(id); ready(id); const stale = screen.getByRole('button', { name: finishLabel(id) });
  act(() => { prepareReadyChildScope('child-b', ['dyscalculia']); });
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument(); fireEvent.click(stale); expect(done).not.toHaveBeenCalled();
});

test.each(['readiness', 'profile'])('a batched %s interruption cannot revive old choices', boundary => {
  const done = mount(); ready('dyscalculia-pattern-blocks');
  act(() => {
    if (boundary === 'readiness') {
      useChildProgressStore.setState({ hydrationStatus: 'loading' }); useChildProgressStore.setState({ hydrationStatus: 'ready' });
    } else {
      const profile = useAuthStore.getState().profile!;
      useAuthStore.setState({ profile: { ...profile, neuro_types: [] } }); useAuthStore.setState({ profile });
    }
  });
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument(); expect(done).not.toHaveBeenCalled();
});

test('changing activity IDs without unmounting cannot transfer or revive a checked exercise', () => {
  const done = jest.fn(); const { rerender } = render(<DyscalculiaPracticeActivity activityId="dyscalculia-pattern-blocks" onComplete={done} />);
  ready('dyscalculia-pattern-blocks'); rerender(<DyscalculiaPracticeActivity activityId="dyscalculia-real-world" onComplete={done} />);
  rerender(<DyscalculiaPracticeActivity activityId="dyscalculia-pattern-blocks" onComplete={done} />);
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument(); expect(done).not.toHaveBeenCalled();
});
