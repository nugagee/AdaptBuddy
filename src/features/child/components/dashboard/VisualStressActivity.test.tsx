import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import VisualStressActivity, { isVisualStressActivity } from './VisualStressActivity';

const advance = (ms: number) => act(() => { jest.advanceTimersByTime(ms); });
const setHidden = (hidden: boolean) => act(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
  document.dispatchEvent(new Event('visibilitychange'));
});
const renderTool = (id: 'visual-comfort-read' | 'visual-font-lab' | 'visual-break-2020') => {
  const onComplete = jest.fn();
  const view = render(<VisualStressActivity activityId={id} onComplete={onComplete} />);
  return { ...view, onComplete };
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-12T10:00:00Z'));
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  prepareReadyChildScope('visual-child', ['visual-stress']);
});
afterEach(() => {
  clearReadyChildScope();
  jest.clearAllTimers();
  jest.useRealTimers();
  Reflect.deleteProperty(document, 'hidden');
});

describe('Visual Stress comfort reader', () => {
  it('requires an actual line acknowledgement, then emits measured time only once', () => {
    const { onComplete } = renderTool('visual-comfort-read');
    const record = screen.getByRole('button', { name: 'Record reading session' });
    expect(record).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next line' }));
    expect(record).toBeDisabled();
    advance(12000);
    fireEvent.click(screen.getByRole('button', { name: 'I read this line' }));
    fireEvent.click(record);
    fireEvent.click(record);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({ durationMinutes: 0.2 });
  });

  it('changes live presentation without saving a reading session', () => {
    const { onComplete } = renderTool('visual-comfort-read');
    fireEvent.change(screen.getByLabelText('Page background'), { target: { value: 'blue' } });
    fireEvent.change(screen.getByLabelText('Text size'), { target: { value: 'extra-large' } });
    fireEvent.change(screen.getByLabelText('Font style'), { target: { value: 'serif' } });
    fireEvent.change(screen.getByLabelText('Line spacing'), { target: { value: 'extra-wide' } });
    fireEvent.change(screen.getByLabelText('Reading width'), { target: { value: 'narrow' } });
    expect(screen.getByRole('region', { name: 'Comfort reading preview' })).toHaveStyle({ backgroundColor: '#eaf4ff', fontSize: '1.875rem', fontFamily: 'Georgia, serif', lineHeight: '2.2', maxWidth: '32ch' });
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Record reading session' })).toBeDisabled();
  });

  it('does not count the same line twice and resets reading progress on passage change', () => {
    renderTool('visual-comfort-read');
    for (let i = 0; i < 7; i++) fireEvent.click(screen.getByRole('button', { name: 'I read this line' }));
    expect(screen.getByRole('progressbar', { name: 'Reading progress' })).toHaveAttribute('value', '4');
    fireEvent.change(screen.getByLabelText('Reading passage'), { target: { value: '1' } });
    expect(screen.getByRole('heading', { name: 'The Paper Boat' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Reading progress' })).toHaveAttribute('value', '0');
    expect(screen.getByRole('button', { name: 'Record reading session' })).toBeDisabled();
  });

  it('supports keyboard acknowledgement and optional ruler controls', async () => {
    renderTool('visual-comfort-read');
    const button = screen.getByRole('button', { name: 'I read this line' });
    expect(button).toHaveClass('min-h-12');
    button.focus();
    await act(async () => { await userEvent.keyboard('{Enter}'); });
    expect(screen.getByRole('progressbar', { name: 'Reading progress' })).toHaveAttribute('value', '1');
    fireEvent.click(screen.getByLabelText('Reading ruler'));
    expect(screen.getByLabelText('Reading ruler')).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Reset layout' }));
    expect(screen.getByLabelText('Reading ruler')).toBeChecked();
  });

  it('excludes time in a hidden tab from measured reading session time', () => {
    const { onComplete } = renderTool('visual-comfort-read');
    advance(5000);
    setHidden(true);
    advance(60000);
    setHidden(false);
    advance(5000);
    fireEvent.click(screen.getByRole('button', { name: 'I read this line' }));
    fireEvent.click(screen.getByRole('button', { name: 'Record reading session' }));
    expect(onComplete.mock.calls[0][0].durationMinutes).toBeCloseTo(10 / 60);
  });
});

describe('Visual Stress typography lab', () => {
  it('requires a changed layout and explicit trial before completion', () => {
    const { onComplete } = renderTool('visual-font-lab');
    const record = screen.getByRole('button', { name: 'Record layout practice' });
    expect(record).toBeDisabled();
    expect(screen.getByLabelText('I tried this layout')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Font style'), { target: { value: 'mono' } });
    expect(record).toBeDisabled();
    fireEvent.click(screen.getByLabelText('I tried this layout'));
    advance(6000);
    fireEvent.click(record);
    expect(onComplete).toHaveBeenCalledWith({ durationMinutes: 0.1 });
  });

  it('keeps the starting preview unchanged and invalidates confirmation after a new choice', () => {
    renderTool('visual-font-lab');
    fireEvent.change(screen.getByLabelText('Text size'), { target: { value: 'extra-large' } });
    const original = within(screen.getByRole('region', { name: 'Starting layout preview' })).getByText(/I can change how/);
    const changed = within(screen.getByRole('region', { name: 'My layout preview' })).getByText(/I can change how/);
    expect(original).toHaveStyle({ fontSize: '1.5rem' });
    expect(changed).toHaveStyle({ fontSize: '1.875rem' });
    fireEvent.click(screen.getByLabelText('I tried this layout'));
    fireEvent.change(screen.getByLabelText('Line spacing'), { target: { value: 'extra-wide' } });
    expect(screen.getByLabelText('I tried this layout')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Record layout practice' })).toBeDisabled();
  });

  it('resets choices and the trial gate, and does not store settings in browser storage', () => {
    const { unmount } = renderTool('visual-font-lab');
    const before = JSON.stringify({ ...window.localStorage });
    fireEvent.change(screen.getByLabelText('Page background'), { target: { value: 'mint' } });
    fireEvent.click(screen.getByLabelText('I tried this layout'));
    fireEvent.click(screen.getByRole('button', { name: 'Reset layout' }));
    expect(screen.getByLabelText('Page background')).toHaveValue('cream');
    expect(screen.getByLabelText('I tried this layout')).toBeDisabled();
    expect(JSON.stringify({ ...window.localStorage })).toBe(before);
    unmount();
    renderTool('visual-font-lab');
    expect(screen.getByLabelText('Page background')).toHaveValue('cream');
  });
});

describe('optional Screen Break', () => {
  it('never autostarts or auto-records, including when the timer expires', () => {
    const { onComplete } = renderTool('visual-break-2020');
    advance(30000);
    expect(screen.getByText('20 seconds')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /I took my break/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Start break' }));
    advance(20000);
    expect(screen.getByText('0 seconds')).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /I took my break/ }));
    expect(onComplete).toHaveBeenCalledWith({ durationMinutes: 20 / 60 });
  });

  it('excludes paused time and resumes from the saved count', () => {
    const { onComplete } = renderTool('visual-break-2020');
    fireEvent.click(screen.getByRole('button', { name: 'Start break' }));
    advance(5000);
    fireEvent.click(screen.getByRole('button', { name: 'Pause break' }));
    advance(120000);
    expect(screen.getByText('15 seconds')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /I took my break/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Resume break' }));
    advance(15000);
    fireEvent.click(screen.getByRole('button', { name: /I took my break/ }));
    expect(onComplete).toHaveBeenCalledWith({ durationMinutes: 20 / 60 });
  });

  it('pauses when hidden and requires explicit resume after returning', () => {
    renderTool('visual-break-2020');
    fireEvent.click(screen.getByRole('button', { name: 'Start break' }));
    advance(5000);
    setHidden(true);
    advance(60000);
    setHidden(false);
    advance(5000);
    expect(screen.getByText('15 seconds')).toBeInTheDocument();
    expect(screen.getByText(/Paused while this tab was away/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume break' })).toBeInTheDocument();
  });

  it('offers an untimed mode with no visible countdown and explicit finish', () => {
    const { onComplete } = renderTool('visual-break-2020');
    fireEvent.click(screen.getByRole('button', { name: 'No timer' }));
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start break' }));
    advance(7000);
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /I took my break/ }));
    expect(onComplete.mock.calls[0][0].durationMinutes).toBeCloseTo(7 / 60);
  });

  it('clears time on reset and when changing modes', () => {
    renderTool('visual-break-2020');
    fireEvent.click(screen.getByRole('button', { name: 'Start break' }));
    advance(5000);
    fireEvent.click(screen.getByRole('button', { name: 'Reset break' }));
    expect(screen.getByText('20 seconds')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start break' }));
    advance(5000);
    fireEvent.click(screen.getByRole('button', { name: 'No timer' }));
    expect(screen.getByRole('button', { name: /I took my break/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Start break' })).toBeInTheDocument();
  });

  it('cancels timers on unmount without awarding completion', () => {
    const { onComplete, unmount } = renderTool('visual-break-2020');
    fireEvent.click(screen.getByRole('button', { name: 'Start break' }));
    unmount();
    advance(60000);
    expect(onComplete).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('Visual Stress scope isolation', () => {
  it.each(['loading', 'error'] as const)('blocks rendering before the child store is ready: %s', (hydrationStatus) => {
    useChildProgressStore.setState({ hydrationStatus });
    renderTool('visual-comfort-read');
    expect(screen.getByRole('status')).toHaveTextContent(/not ready/);
    expect(screen.queryByLabelText('Page background')).not.toBeInTheDocument();
  });

  it('does not accept a stale-owner completion after a previously valid interaction', () => {
    const { onComplete } = renderTool('visual-comfort-read');
    fireEvent.click(screen.getByRole('button', { name: 'I read this line' }));
    const record = screen.getByRole('button', { name: 'Record reading session' });
    act(() => {
      useChildProgressStore.setState({ ownerId: 'other-child' });
      fireEvent.click(record);
    });
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Reading passage')).not.toBeInTheDocument();
  });

  it('discards an in-progress break when accounts change', () => {
    const { onComplete } = renderTool('visual-break-2020');
    fireEvent.click(screen.getByRole('button', { name: 'Start break' }));
    advance(5000);
    act(() => prepareReadyChildScope('other-child', ['visual-stress']));
    advance(30000);
    expect(screen.getByRole('status')).toHaveTextContent(/session has changed/);
    expect(screen.queryByRole('button', { name: /I took my break/ })).not.toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('supports the ready transient guest without writing settings or contacting a service', () => {
    prepareReadyChildScope('guest-child', ['visual-stress']);
    useAuthStore.setState({ user: null, isGuest: true });
    const { onComplete } = renderTool('visual-font-lab');
    const before = JSON.stringify({ ...window.localStorage });
    fireEvent.change(screen.getByLabelText('Text size'), { target: { value: 'standard' } });
    fireEvent.click(screen.getByLabelText('I tried this layout'));
    fireEvent.click(screen.getByRole('button', { name: 'Record layout practice' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(Object.keys(onComplete.mock.calls[0][0])).toEqual(['durationMinutes']);
    expect(JSON.stringify({ ...window.localStorage })).toBe(before);
  });

  it('accepts only the three exact catalogue IDs', () => {
    expect(isVisualStressActivity('visual-comfort-read')).toBe(true);
    expect(isVisualStressActivity('visual-font-lab')).toBe(true);
    expect(isVisualStressActivity('visual-break-2020')).toBe(true);
    expect(isVisualStressActivity('visual-made-up')).toBe(false);
    expect(isVisualStressActivity('dyslexia-overlay-read')).toBe(false);
  });
});
