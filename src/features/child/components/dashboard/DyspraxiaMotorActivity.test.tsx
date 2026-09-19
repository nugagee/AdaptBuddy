import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import DyspraxiaMotorActivity from './DyspraxiaMotorActivity';
import { MOVEMENT_CARDS, MOVEMENT_CHECKS, PLACEMENT_BOARDS, type DyspraxiaMotorId } from './dyspraxiaMotorContent';

const FINE: DyspraxiaMotorId = 'dyspraxia-fine-motor';
const GROSS: DyspraxiaMotorId = 'dyspraxia-gross-motor';
beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-09-10T10:00:00Z'));
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  prepareReadyChildScope('child-a', ['dyspraxia']);
});
afterEach(() => { cleanup(); clearReadyChildScope(); jest.useRealTimers(); Reflect.deleteProperty(document, 'hidden'); });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const check = (name: string) => fireEvent.click(screen.getByRole('checkbox', { name }));
const mount = (id: DyspraxiaMotorId = FINE) => {
  const done = jest.fn();
  const result = render(<DyspraxiaMotorActivity activityId={id} onComplete={done} />);
  return { done, ...result };
};
const placeOne = () => { click('Choose Moon'); click('Place in first space'); check('I explored placing or moving a piece'); };
const exploreCard = (outcome = 'I read or imagined a step') => {
  click('Open selected card'); click('Mark this step explored'); click(outcome); check('I reviewed this card in my own way');
};
const enableMovement = () => { click('Try a seated action'); MOVEMENT_CHECKS.forEach(check); };
const hidden = (value: boolean) => {
  Object.defineProperty(document, 'hidden', { configurable: true, value }); fireEvent(document, new Event('visibilitychange'));
};

describe('Dyspraxia fine motor placement', () => {
  test('opening, selecting or waiting never awards an untouched board', () => {
    const { done } = mount();
    expect(screen.getByRole('button', { name: 'Place in first space' })).toBeDisabled();
    click('Choose Moon'); act(() => { jest.advanceTimersByTime(600000); });
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Record placement practice' })).toBeDisabled(); expect(done).not.toHaveBeenCalled();
  });
  test('one placed piece and explicit review records partial practice exactly once', () => {
    const { done } = mount(); click('Choose Moon'); click('Place in first space');
    expect(screen.getByRole('button', { name: 'Record placement practice' })).toBeDisabled();
    check('I explored placing or moving a piece'); act(() => { jest.advanceTimersByTime(12000); });
    click('Record placement practice');
    expect(done).toHaveBeenCalledTimes(1); expect(done).toHaveBeenCalledWith({ durationMinutes: 0.2 });
    expect(screen.getByRole('status')).toHaveTextContent('Your open activity choices have been cleared');
    expect(screen.queryByRole('button', { name: 'Choose Moon' })).not.toBeInTheDocument();
  });
  test.each(PLACEMENT_BOARDS.map(board => [board.title, board.pieces[0]]))('%s has a labelled usable placement route', (title, piece) => {
    const { done } = mount(); click(title); click(`Choose ${piece}`); click('Place in last space');
    expect(screen.getByTestId('motor-space-2')).toHaveTextContent(piece); check('I explored placing or moving a piece'); click('Record placement practice');
    expect(done).toHaveBeenCalledWith({ durationMinutes: 0 });
  });
  test('arrangements allow shared spaces without correctness scoring', () => {
    mount(); click('Choose Moon'); click('Place in middle space'); click('Choose Star'); click('Place in middle space');
    expect(screen.getByTestId('motor-space-1')).toHaveTextContent('Moon, Star');
    expect(screen.getByText('2 of 3 pieces placed. This is not a coordination score.')).toBeInTheDocument();
  });
  test('moving a piece invalidates the earlier review and undo restores its location', () => {
    mount(); placeOne(); click('Place in middle space'); expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByTestId('motor-space-0')).toHaveTextContent('Empty space');
    click('Undo last placement'); expect(screen.getByTestId('motor-space-0')).toHaveTextContent('Moon');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
  test('returning the only piece to its tray removes completion eligibility', () => {
    mount(); placeOne(); click('Return selected piece to tray');
    expect(screen.getByRole('checkbox')).toBeDisabled(); expect(screen.getByRole('button', { name: 'Record placement practice' })).toBeDisabled();
    click('Undo last placement'); expect(screen.getByTestId('motor-space-0')).toHaveTextContent('Moon');
  });
  test('board changes and clearing discard both arrangement and undo history', () => {
    mount(); placeOne(); click('Garden pieces');
    expect(screen.getByTestId('motor-space-0')).toHaveTextContent('Empty space'); expect(screen.getByRole('button', { name: 'Undo last placement' })).toBeDisabled();
    click('Choose Leaf'); click('Place in first space'); click('Clear placement practice');
    expect(screen.getByRole('checkbox')).toBeDisabled(); expect(screen.getByRole('button', { name: 'Undo last placement' })).toBeDisabled();
  });
  test('one-piece view navigates without auto-selecting or moving pieces', () => {
    mount(); click('Show one piece at a time'); expect(screen.getByText('Piece 1 of 3')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Choose Star' })).not.toBeInTheDocument();
    click('Next piece'); expect(screen.getByRole('button', { name: 'Choose Star' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Place in first space' })).toBeDisabled(); click('Next piece');
    expect(screen.getByRole('button', { name: 'Next piece' })).toBeDisabled(); click('Previous piece');
    expect(screen.getByText('Piece 2 of 3')).toBeInTheDocument();
  });
  test('real keyboard activation selects, places and reviews without dragging', async () => {
    const { done } = mount(); screen.getByRole('button', { name: 'Choose Moon' }).focus();
    await act(async () => { await userEvent.keyboard('{Enter}'); });
    screen.getByRole('button', { name: 'Place in first space' }).focus();
    await act(async () => { await userEvent.keyboard('{Enter}'); });
    screen.getByRole('checkbox').focus(); await act(async () => { await userEvent.keyboard(' '); });
    screen.getByRole('button', { name: 'Record placement practice' }).focus();
    await act(async () => { await userEvent.keyboard('{Enter}'); }); expect(done).toHaveBeenCalledTimes(1);
  });
  test('explicit pause preserves arrangement but hides controls and excludes paused duration', () => {
    const { done } = mount(); placeOne(); act(() => { jest.advanceTimersByTime(6000); });
    click('Pause this practice'); act(() => { jest.advanceTimersByTime(60000); });
    expect(screen.queryByRole('button', { name: 'Record placement practice' })).not.toBeInTheDocument();
    click('Continue this practice'); expect(screen.getByRole('checkbox')).toBeChecked();
    act(() => { jest.advanceTimersByTime(6000); }); click('Record placement practice');
    expect(done).toHaveBeenCalledWith({ durationMinutes: 0.2 });
  });
  test('hidden time is excluded and hidden completion is rejected', () => {
    const { done } = mount(); placeOne(); const finish = screen.getByRole('button', { name: 'Record placement practice' });
    act(() => { jest.advanceTimersByTime(6000); }); hidden(true); act(() => { jest.advanceTimersByTime(60000); });
    fireEvent.click(finish); expect(done).not.toHaveBeenCalled(); hidden(false); act(() => { jest.advanceTimersByTime(6000); });
    click('Record placement practice'); expect(done).toHaveBeenCalledWith({ durationMinutes: 0.2 });
  });
});

describe('Dyspraxia movement cards', () => {
  test('read-only is the default and opening alone cannot complete an activity', () => {
    const { done } = mount(GROSS);
    expect(screen.getByRole('button', { name: 'Read or imagine' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('checkbox', { name: MOVEMENT_CHECKS[0] })).not.toBeInTheDocument();
    click('Open selected card'); expect(screen.getByRole('button', { name: 'Record card exploration' })).toBeDisabled();
    act(() => { jest.advanceTimersByTime(120000); }); expect(done).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'I tried a comfortable seated action' })).not.toBeInTheDocument();
  });
  test.each(['I read or imagined a step', 'I chose to rest', 'I chose to ask for help'])('%s earns equal reviewed card-exploration credit', outcome => {
    const { done } = mount(GROSS); exploreCard(outcome); click('Record card exploration');
    expect(done).toHaveBeenCalledWith({ durationMinutes: 0 }); expect(done).toHaveBeenCalledTimes(1);
  });
  test.each(MOVEMENT_CARDS.map(card => card.title))('%s is usable without requiring movement', title => {
    const { done } = mount(GROSS); click(title); exploreCard(); click('Record card exploration');
    expect(done).toHaveBeenCalledWith({ durationMinutes: 0 });
  });
  test('optional seated mode requires all three distinct acknowledgements', () => {
    mount(GROSS); click('Try a seated action'); const open = screen.getByRole('button', { name: 'Open selected card' });
    expect(open).toBeDisabled(); check(MOVEMENT_CHECKS[0]); check(MOVEMENT_CHECKS[1]); expect(open).toBeDisabled();
    check(MOVEMENT_CHECKS[2]); expect(open).toBeEnabled();
    expect(screen.getByText(/not a verified adult approval/)).toBeInTheDocument();
  });
  test('seated participation records no physical outcome or safety-acknowledgement payload', () => {
    const { done } = mount(GROSS); enableMovement(); exploreCard('I tried a comfortable seated action'); click('Record card exploration');
    expect(done).toHaveBeenCalledWith({ durationMinutes: 0 });
    expect(Object.keys(done.mock.calls[0][0])).toEqual(['durationMinutes']);
  });
  test('revoking a movement acknowledgement closes the open card and clears its review', () => {
    mount(GROSS); enableMovement(); exploreCard('I chose to rest'); check(MOVEMENT_CHECKS[1]);
    expect(screen.queryByRole('region', { name: 'Open movement card' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open selected card' })).toBeDisabled();
  });
  test('changing movement card requires fresh safety checks', () => {
    mount(GROSS); enableMovement(); click('Open selected card'); click('Gentle foot taps');
    MOVEMENT_CHECKS.forEach(label => expect(screen.getByRole('checkbox', { name: label })).not.toBeChecked());
    expect(screen.getByRole('button', { name: 'Open selected card' })).toBeDisabled();
  });
  test('browsing steps never acknowledges them and a changed outcome resets final review', () => {
    mount(GROSS); click('Open selected card'); click('Next step'); click('Next step');
    expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'I chose to rest' })).toBeDisabled(); click('Mark this step explored');
    click('I chose to rest'); check('I reviewed this card in my own way'); click('I chose to ask for help');
    expect(screen.getByRole('checkbox')).not.toBeChecked(); expect(screen.getByRole('button', { name: 'Record card exploration' })).toBeDisabled();
  });
  test('read-only exploration is keyboard accessible', async () => {
    const { done } = mount(GROSS);
    for (const name of ['Open selected card', 'Mark this step explored', 'I read or imagined a step']) {
      screen.getByRole('button', { name }).focus(); await act(async () => { await userEvent.keyboard('{Enter}'); });
    }
    screen.getByRole('checkbox').focus(); await act(async () => { await userEvent.keyboard(' '); });
    screen.getByRole('button', { name: 'Record card exploration' }).focus();
    await act(async () => { await userEvent.keyboard('{Enter}'); }); expect(done).toHaveBeenCalledTimes(1);
  });
  test.each(['pause', 'hidden', 'blur'])('%s returns seated mode to read-only and clears movement checks', trigger => {
    mount(GROSS); enableMovement(); click('Open selected card'); click('Mark this step explored');
    if (trigger === 'pause') { click('Pause this practice'); click('Continue this practice'); }
    if (trigger === 'hidden') { hidden(true); hidden(false); }
    if (trigger === 'blur') fireEvent(window, new Event('blur'));
    expect(screen.getByRole('button', { name: 'Read or imagine' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('region', { name: 'Open movement card' })).not.toBeInTheDocument();
    click('Try a seated action'); MOVEMENT_CHECKS.forEach(label => expect(screen.getByRole('checkbox', { name: label })).not.toBeChecked());
  });
  test('stopping never awards completion and locks seated actions for the rest of this launch', () => {
    const { done } = mount(GROSS); enableMovement(); exploreCard('I tried a comfortable seated action');
    click('Stop — I need rest or help'); expect(done).not.toHaveBeenCalled();
    expect(screen.getByText(/No message or alert has been sent/)).toBeInTheDocument();
    click('Continue with a read-only card'); expect(screen.getByRole('button', { name: 'Try a seated action' })).toBeDisabled();
    click('Reset movement card'); expect(screen.getByRole('button', { name: 'Try a seated action' })).toBeDisabled();
    exploreCard('I chose to rest'); click('Record card exploration'); expect(done).toHaveBeenCalledTimes(1);
  });
  test('stop remains available during pause while continuation cannot restart early', () => {
    const { done } = mount(GROSS); enableMovement(); click('Open selected card'); click('Pause this practice');
    click('Stop — I need rest or help'); expect(screen.getByRole('button', { name: 'Continue with a read-only card' })).toBeDisabled();
    expect(done).not.toHaveBeenCalled(); click('Continue this practice'); click('Continue with a read-only card');
    expect(screen.getByRole('button', { name: 'Try a seated action' })).toBeDisabled();
  });
  test('reset clears open exploration and any prior review', () => {
    mount(GROSS); exploreCard(); click('Reset movement card'); click('Open selected card');
    expect(screen.getByRole('button', { name: 'Record card exploration' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mark this step explored' })).toBeEnabled();
  });
});

describe('Dyspraxia account boundary', () => {
  test.each([FINE, GROSS])('%s guest use leaves persistent storage and output free of activity choices', id => {
    prepareReadyChildScope('guest-child', ['dyspraxia']); useAuthStore.setState({ user: null, session: null, isGuest: true });
    const before = { ...localStorage }; const { done } = mount(id);
    if (id === FINE) { placeOne(); click('Record placement practice'); } else { exploreCard(); click('Record card exploration'); }
    expect(done).toHaveBeenCalledWith({ durationMinutes: 0 }); expect({ ...localStorage }).toEqual(before);
  });
  test.each(['owner', 'loading', 'profile'])('%s mismatch rejects launch', mismatch => {
    if (mismatch === 'owner') useChildProgressStore.setState({ ownerId: 'child-b' });
    if (mismatch === 'loading') useChildProgressStore.setState({ hydrationStatus: 'loading' });
    if (mismatch === 'profile') useAuthStore.setState({ profile: { ...useAuthStore.getState().profile!, neuro_types: ['adhd'] } });
    const { done } = mount(); expect(screen.getByRole('status')).toHaveTextContent('original child session');
    expect(screen.queryByRole('button')).not.toBeInTheDocument(); expect(done).not.toHaveBeenCalled();
  });
  test.each([FINE, GROSS])('%s rejects stale completion after a child-account change', id => {
    const { done } = mount(id);
    if (id === FINE) placeOne(); else exploreCard();
    const stale = screen.getByRole('button', { name: id === FINE ? 'Record placement practice' : 'Record card exploration' });
    act(() => { prepareReadyChildScope('child-b', ['dyspraxia']); }); fireEvent.click(stale);
    expect(screen.getByRole('status')).toHaveTextContent('original child session'); expect(done).not.toHaveBeenCalled();
  });
  test('batched loading and readiness recovery cannot revive previous review', () => {
    const { done } = mount(); placeOne();
    act(() => { useChildProgressStore.setState({ hydrationStatus: 'loading' }); useChildProgressStore.setState({ hydrationStatus: 'ready' }); });
    expect(screen.queryByRole('button')).not.toBeInTheDocument(); expect(done).not.toHaveBeenCalled();
  });
  test('batched profile removal and restoration permanently invalidate the launch', () => {
    const { done } = mount(GROSS); exploreCard(); const profile = useAuthStore.getState().profile!;
    act(() => { useAuthStore.setState({ profile: { ...profile, neuro_types: [] } }); useAuthStore.setState({ profile }); });
    expect(screen.queryByRole('button')).not.toBeInTheDocument(); expect(done).not.toHaveBeenCalled();
  });
  test('reusing a mounted activity for a different tool cannot carry choices across', () => {
    const { done, rerender } = mount(); placeOne(); rerender(<DyspraxiaMotorActivity activityId={GROSS} onComplete={done} />);
    expect(screen.getByRole('status')).toHaveTextContent('original child session'); expect(done).not.toHaveBeenCalled();
  });
});
