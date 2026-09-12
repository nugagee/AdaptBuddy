import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import ExecutiveFunctionActivity from './ExecutiveFunctionActivity';
import { FIRST_STEP_TASKS, READY_CHECKLISTS, type ExecutiveActivityId } from './executiveFunctionContent';

const FIRST: ExecutiveActivityId = 'executive-first-step';
const CHECK: ExecutiveActivityId = 'executive-ready-checklist';
const CHANGE: ExecutiveActivityId = 'executive-change-plan';
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const choose = (name: string, value: string) => fireEvent.change(screen.getByRole('combobox', { name }), { target: { value } });
const confirm = () => fireEvent.click(screen.getByRole('checkbox'));
const planFirst = () => { click('Look at one instruction.'); click('Ask someone to help'); confirm(); };
const reviewList = (value = 'help') => READY_CHECKLISTS[0].items.forEach((item) => choose(`Status for ${item}`, value));
const planChange = () => {
  choose('What is happening now?', 'Reading'); choose('What might come next?', 'Taking a break');
  click('Ask for more time'); confirm();
};
beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-09-10T10:00:00Z'));
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  prepareReadyChildScope('child-a', ['executive-function']);
});
afterEach(() => { cleanup(); clearReadyChildScope(); jest.useRealTimers(); Reflect.deleteProperty(document, 'hidden'); });

describe('First Step Planner', () => {
  it('requires a step, a support choice and explicit review', () => {
    const done = jest.fn(); render(<ExecutiveFunctionActivity activityId={FIRST} onComplete={done} />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
    click('Look at one instruction.');
    expect(screen.getByRole('checkbox')).toBeDisabled();
    click('Ask someone to help');
    expect(screen.getByRole('button', { name: 'Record first-step practice' })).toBeDisabled();
    confirm(); click('Record first-step practice');
    expect(done).toHaveBeenCalledWith({ durationMinutes: 0 });
  });
  it.each(['Try on my own', 'Ask someone to help', 'Take a pause first'])('accepts %s without requiring the real task to be finished', (support) => {
    const done = jest.fn(); render(<ExecutiveFunctionActivity activityId={FIRST} onComplete={done} />);
    expect(screen.getByText(/do not have to do the task now/)).toBeInTheDocument();
    click('Look at one instruction.'); click(support); confirm(); click('Record first-step practice');
    expect(done).toHaveBeenCalledTimes(1);
    expect(Object.keys(done.mock.calls[0][0])).toEqual(['durationMinutes']);
  });
  it('clears review after changing the first step or support', () => {
    render(<ExecutiveFunctionActivity activityId={FIRST} onComplete={jest.fn()} />); planFirst();
    click('Choose a place to begin.'); expect(screen.getByRole('checkbox')).not.toBeChecked();
    confirm(); click('Take a pause first'); expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Record first-step practice' })).toBeDisabled();
  });
  it('resets choices on a different example and on clear', () => {
    render(<ExecutiveFunctionActivity activityId={FIRST} onComplete={jest.fn()} />); planFirst();
    choose('Planning example', '1');
    expect(screen.getByRole('region', { name: 'My first-step plan' })).not.toHaveTextContent('Look at one instruction.');
    expect(screen.getByRole('checkbox')).toBeDisabled();
    click('Choose one material.'); click('Try on my own'); confirm(); click('Clear first-step plan');
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Choose one material.' })).toHaveAttribute('aria-pressed', 'false');
  });
  it.each([0, 1, 2])('offers three small steps for example %s', (index) => {
    render(<ExecutiveFunctionActivity activityId={FIRST} onComplete={jest.fn()} />);
    choose('Planning example', String(index));
    expect(within(screen.getByRole('group', { name: 'Choose one first step' })).getAllByRole('button')).toHaveLength(3);
    FIRST_STEP_TASKS[index].steps.forEach((text) => expect(screen.getByRole('button', { name: text })).toBeInTheDocument());
  });
  it('supports keyboard first-step selection with visible selected state', async () => {
    render(<ExecutiveFunctionActivity activityId={FIRST} onComplete={jest.fn()} />);
    const step = screen.getByRole('button', { name: 'Look at one instruction.' });
    expect(step).toHaveClass('min-h-12'); step.focus();
    await act(async () => { await userEvent.keyboard('{Enter}'); });
    expect(step).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('region', { name: 'My first-step plan' })).toHaveTextContent('Look at one instruction.');
  });
});

describe('Ready-to-Go Checklist', () => {
  it('requires every item to be considered, but never requires everything to be ready', () => {
    const done = jest.fn(); render(<ExecutiveFunctionActivity activityId={CHECK} onComplete={done} />);
    choose('Status for Something to work on', 'ready');
    choose('Status for Things I want to use', 'not-needed');
    expect(screen.getByRole('checkbox')).toBeDisabled();
    choose('Status for A place that works for me', 'help');
    expect(screen.getByRole('button', { name: 'Record checklist practice' })).toBeDisabled();
    confirm(); click('Record checklist practice'); expect(done).toHaveBeenCalledWith({ durationMinutes: 0 });
  });
  it.each(['ready', 'not-needed', 'help'])('accepts all items marked %s equally', (value) => {
    const done = jest.fn(); render(<ExecutiveFunctionActivity activityId={CHECK} onComplete={done} />);
    reviewList(value); confirm(); click('Record checklist practice'); expect(done).toHaveBeenCalledTimes(1);
  });
  it('retains choices through one-item navigation without auto-review', () => {
    render(<ExecutiveFunctionActivity activityId={CHECK} onComplete={jest.fn()} />);
    click('Show one checklist item');
    expect(screen.getByRole('button', { name: 'Previous checklist item' })).toBeDisabled();
    choose('Status for Something to work on', 'help'); click('Next checklist item');
    expect(screen.getByText('Item 2 of 3')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Status for Something to work on' })).not.toBeInTheDocument();
    choose('Status for Things I want to use', 'ready'); click('Next checklist item');
    expect(screen.getByRole('button', { name: 'Next checklist item' })).toBeDisabled();
    choose('Status for A place that works for me', 'not-needed');
    click('Show the whole checklist');
    expect(screen.getByRole('combobox', { name: 'Status for Something to work on' })).toHaveValue('help');
    expect(screen.getByRole('button', { name: 'Record checklist practice' })).toBeDisabled();
  });
  it('invalidates confirmation after changing or clearing a status', () => {
    render(<ExecutiveFunctionActivity activityId={CHECK} onComplete={jest.fn()} />); reviewList(); confirm();
    choose('Status for Something to work on', 'ready'); expect(screen.getByRole('checkbox')).not.toBeChecked();
    confirm(); choose('Status for Something to work on', ''); expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Record checklist practice' })).toBeDisabled();
  });
  it('clears old choices and one-item view for a different checklist', () => {
    render(<ExecutiveFunctionActivity activityId={CHECK} onComplete={jest.fn()} />); reviewList(); confirm();
    click('Show one checklist item'); choose('Checklist example', '2');
    expect(screen.getByRole('button', { name: 'Show one checklist item' })).toHaveAttribute('aria-pressed', 'false');
    READY_CHECKLISTS[2].items.forEach((item) => expect(screen.getByRole('combobox', { name: `Status for ${item}` })).toHaveValue(''));
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });
  it('explicitly clears all checklist choices', () => {
    render(<ExecutiveFunctionActivity activityId={CHECK} onComplete={jest.fn()} />); reviewList(); confirm();
    click('Clear checklist choices'); expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.getByRole('region', { name: 'My checklist review' })).toHaveTextContent('Not reviewed yet');
  });
});

describe('Change of Plan', () => {
  it('requires different now/next choices, support and review', () => {
    const done = jest.fn(); render(<ExecutiveFunctionActivity activityId={CHANGE} onComplete={done} />);
    choose('What is happening now?', 'Reading'); choose('What might come next?', 'Reading'); click('Ask for more time');
    expect(screen.getByText(/You can stay with your activity/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeDisabled();
    choose('What might come next?', 'Taking a break');
    expect(screen.getByRole('button', { name: 'Record transition practice' })).toBeDisabled();
    confirm(); click('Record transition practice'); expect(done).toHaveBeenCalledWith({ durationMinutes: 0 });
  });
  it.each(['Take a quiet pause', 'Ask for more time', 'Ask someone to explain what is next'])('accepts the bridge %s without forced moving on', (bridge) => {
    const done = jest.fn(); render(<ExecutiveFunctionActivity activityId={CHANGE} onComplete={done} />);
    choose('What is happening now?', 'Reading'); choose('What might come next?', 'Taking a break');
    click(bridge); confirm(); click('Record transition practice'); expect(done).toHaveBeenCalledTimes(1);
  });
  it('invalidates review when any part changes', () => {
    render(<ExecutiveFunctionActivity activityId={CHANGE} onComplete={jest.fn()} />); planChange();
    choose('What is happening now?', 'Organising things'); expect(screen.getByRole('checkbox')).not.toBeChecked();
    confirm(); click('Take a quiet pause'); expect(screen.getByRole('checkbox')).not.toBeChecked();
    confirm(); choose('What might come next?', 'A creative activity'); expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
  it('clears the entire transition card without rewarding it', () => {
    const done = jest.fn(); render(<ExecutiveFunctionActivity activityId={CHANGE} onComplete={done} />); planChange();
    click('Clear change-of-plan card');
    expect(screen.getByRole('combobox', { name: 'What is happening now?' })).toHaveValue('');
    expect(screen.getByRole('checkbox')).toBeDisabled(); expect(done).not.toHaveBeenCalled();
  });
});

describe('Planning session boundaries', () => {
  it('keeps choices while paused but blocks completion and excludes paused time', () => {
    const done = jest.fn(); render(<ExecutiveFunctionActivity activityId={FIRST} onComplete={done} />); planFirst();
    const finish = screen.getByRole('button', { name: 'Record first-step practice' });
    act(() => { jest.advanceTimersByTime(10000); }); click('Pause planning');
    expect(screen.queryByRole('button', { name: 'Record first-step practice' })).not.toBeInTheDocument();
    fireEvent.click(finish); expect(done).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(60000); }); click('Continue planning');
    expect(screen.getByRole('region', { name: 'My first-step plan' })).toHaveTextContent('Look at one instruction.');
    act(() => { jest.advanceTimersByTime(10000); }); click('Record first-step practice');
    expect(done.mock.calls[0][0].durationMinutes).toBeCloseTo(20 / 60);
  });
  it('excludes hidden time and rejects a hidden-document completion', () => {
    const done = jest.fn(); render(<ExecutiveFunctionActivity activityId={FIRST} onComplete={done} />); planFirst();
    act(() => { jest.advanceTimersByTime(10000); });
    Object.defineProperty(document, 'hidden', { configurable: true, value: true }); fireEvent(document, new Event('visibilitychange'));
    click('Record first-step practice'); expect(done).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(60000); });
    Object.defineProperty(document, 'hidden', { configurable: true, value: false }); fireEvent(document, new Event('visibilitychange'));
    act(() => { jest.advanceTimersByTime(10000); }); click('Record first-step practice');
    expect(done.mock.calls[0][0].durationMinutes).toBeCloseTo(20 / 60);
  });
  it('does not reward waiting and completes at most once', () => {
    const done = jest.fn(); render(<ExecutiveFunctionActivity activityId={FIRST} onComplete={done} />);
    act(() => { jest.advanceTimersByTime(300000); }); expect(done).not.toHaveBeenCalled(); planFirst();
    const finish = screen.getByRole('button', { name: 'Record first-step practice' }); fireEvent.click(finish); fireEvent.click(finish);
    expect(done).toHaveBeenCalledTimes(1);
  });
  it('never sends reminders or implies that selecting help contacts someone', () => {
    render(<ExecutiveFunctionActivity activityId={FIRST} onComplete={jest.fn()} />);
    expect(screen.getByText(/No reminders, messages or adult alerts are sent/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
  it('discards old choices after a child switch and does not resurrect them on return', () => {
    const done = jest.fn(); render(<ExecutiveFunctionActivity activityId={FIRST} onComplete={done} />); planFirst();
    act(() => { prepareReadyChildScope('child-b', ['executive-function']); });
    expect(screen.queryByRole('region', { name: 'My first-step plan' })).not.toBeInTheDocument();
    act(() => { prepareReadyChildScope('child-a', ['executive-function']); });
    expect(screen.getByRole('status')).toHaveTextContent('session has changed'); expect(done).not.toHaveBeenCalled();
  });
  it('rejects even synchronous completion during a batched loading-to-ready transition', () => {
    const done = jest.fn(); render(<ExecutiveFunctionActivity activityId={FIRST} onComplete={done} />); planFirst();
    const finish = screen.getByRole('button', { name: 'Record first-step practice' });
    act(() => {
      useChildProgressStore.setState({ hydrationStatus: 'loading' });
      useChildProgressStore.setState({ hydrationStatus: 'ready' });
      fireEvent.click(finish);
    });
    expect(done).not.toHaveBeenCalled(); expect(screen.getByRole('status')).toHaveTextContent('session has changed');
  });
  it('invalidates a removed and immediately restored support profile', () => {
    const done = jest.fn(); render(<ExecutiveFunctionActivity activityId={FIRST} onComplete={done} />); planFirst();
    const profile = useAuthStore.getState().profile!;
    act(() => {
      useAuthStore.setState({ profile: { ...profile, neuro_types: [] } });
      useAuthStore.setState({ profile });
    });
    expect(screen.getByRole('status')).toHaveTextContent('session has changed'); expect(done).not.toHaveBeenCalled();
  });
  it('rejects a profile without Executive Function', () => {
    prepareReadyChildScope('child-a', ['speech-language']);
    render(<ExecutiveFunctionActivity activityId={FIRST} onComplete={jest.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('not ready for this tool'); expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('rejects an owner mismatch', () => {
    useChildProgressStore.setState({ ownerId: 'child-b' });
    render(<ExecutiveFunctionActivity activityId={FIRST} onComplete={jest.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('rejects unknown activity IDs', () => {
    render(<ExecutiveFunctionActivity activityId={'executive-forged' as ExecutiveActivityId} onComplete={jest.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('cannot carry choices into a different activity prop', () => {
    const done = jest.fn(); const { rerender } = render(<ExecutiveFunctionActivity activityId={FIRST} onComplete={done} />); planFirst();
    rerender(<ExecutiveFunctionActivity activityId={CHANGE} onComplete={done} />);
    expect(screen.getByRole('status')).toHaveTextContent('session has changed'); expect(done).not.toHaveBeenCalled();
  });
});
