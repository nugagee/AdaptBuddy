import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from 'store/authStore';
import { ParentDashboardService, type DashboardSummary } from '../services/parentDashboardService';
import { clearParentScope, parentSnapshot, parentTask, prepareParentScope } from 'testUtils/parentTaskFixtures';
import { PARENT_LOAD_TIMEOUT_MS } from '../hooks/useParentDashboardLoad';
import ParentHubPage from './ParentHubPage';

jest.mock('hooks/useAuth', () => {
  const { useAuthStore: store } = jest.requireActual('store/authStore'); return { useAuth: () => store() };
});
jest.mock('features/parent/components/layout/ParentHubNavbar', () => () => null);
jest.mock('components/support/SupportConnectionsPanel', () => () => null);
jest.mock('components/feedback/FeedbackPulsePanel', () => () => null);
jest.mock('components/digest/BuddyDigestPanel', () => () => null);
jest.mock('components/digest/WeeklyDigestSchedulerPanel', () => () => null);
jest.mock('features/child/components/NowNextLaterBoard', () => () => null);
jest.mock('components/support/EvidencePackPanel', () => () => null);
jest.mock('components/support/SupportActionQueue', () => () => null);
jest.mock('components/support/SupportPlanDraftPanel', () => () => null);
jest.mock('components/support/SupportTimelinePanel', () => () => null);
jest.mock('recharts', () => ({ CartesianGrid: () => null, Line: () => null, LineChart: () => null, ResponsiveContainer: () => null, Tooltip: () => null, XAxis: () => null, YAxis: () => null }));
let load: jest.SpyInstance;
const pending = () => { let resolve!: (data: DashboardSummary) => void; const promise = new Promise<DashboardSummary>(r => { resolve = r; }); return { promise, resolve }; };
const mount = () => render(<MemoryRouter><ParentHubPage /></MemoryRouter>);
const taskHeading = () => screen.findByRole('heading', { name: parentTask.title });
beforeEach(() => { prepareParentScope(); load = jest.spyOn(ParentDashboardService, 'getDashboardSummary').mockResolvedValue(parentSnapshot()); });
afterEach(() => { cleanup(); clearParentScope(); jest.restoreAllMocks(); jest.useRealTimers(); });

test('actual Parent Hub presents the scoped task summary and refreshes it', async () => {
  mount(); expect(await taskHeading()).toBeInTheDocument();
  load.mockResolvedValueOnce(parentSnapshot({ assignmentSummaries: [] })); fireEvent.click(screen.getByRole('button', { name: 'Refresh school tasks' }));
  expect(await screen.findByText('No school tasks returned for this child')).toBeInTheDocument(); expect(load).toHaveBeenCalledTimes(2);
});
test('a partially unavailable dashboard does not display stale tasks or claim an empty school list', async () => {
  load.mockResolvedValue(parentSnapshot({ assignmentSummariesStatus: 'unavailable' })); mount();
  expect(await screen.findByText('School-task data unavailable')).toBeInTheDocument(); expect(screen.queryByText(parentTask.title)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Review/ }));
  const progress = screen.getByText('School task progress').closest('article')!;
  expect(within(progress).getByText('Unavailable')).toBeInTheDocument();
  expect(screen.getByText('Task help requests could not be checked')).toBeInTheDocument(); expect(screen.queryByText('No teacher tasks yet')).not.toBeInTheDocument();
});
test('a missing availability marker is not treated as confirmed data', async () => {
  load.mockResolvedValue(parentSnapshot({ assignmentSummariesStatus: undefined })); mount();
  expect(await screen.findByText('School-task data unavailable')).toBeInTheDocument();
});
test('review counts only recorded support use, not teacher suggestions', async () => {
  mount(); await taskHeading(); fireEvent.click(screen.getByRole('button', { name: /^Review/ }));
  const section = screen.getByRole('heading', { name: 'Support use recorded in tasks' }).closest('article')!;
  expect(within(section).getByText('No support tool evidence yet')).toBeInTheDocument();
  expect(within(section).queryByText('Read aloud')).not.toBeInTheDocument();
});
test('full read failure is redacted and retryable, not a false no-child result', async () => {
  load.mockRejectedValueOnce(new Error('backend private details')); mount();
  expect(await screen.findByRole('heading', { name: 'Parent Hub unavailable' })).toBeInTheDocument();
  expect(screen.queryByText(/backend private details/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry Parent Hub' })); expect(await taskHeading()).toBeInTheDocument();
});
test('a pending refresh clears earlier tasks and cannot be submitted twice through a stale button', async () => {
  const delayed = pending(); mount(); await taskHeading(); load.mockReturnValueOnce(delayed.promise);
  const refresh = screen.getByRole('button', { name: 'Refresh school tasks' }); fireEvent.click(refresh); fireEvent.click(refresh);
  expect(screen.queryByText(parentTask.title)).not.toBeInTheDocument(); expect(load).toHaveBeenCalledTimes(2);
  await act(async () => delayed.resolve(parentSnapshot())); expect(await taskHeading()).toBeInTheDocument();
});
test('a failed refresh does not restore earlier tasks', async () => {
  mount(); await taskHeading(); load.mockRejectedValueOnce(new Error('offline')); fireEvent.click(screen.getByRole('button', { name: 'Refresh school tasks' }));
  expect(await screen.findByText('Parent Hub unavailable')).toBeInTheDocument(); expect(screen.queryByText(parentTask.title)).not.toBeInTheDocument();
});
test('a delayed old-account response cannot replace the new parent result', async () => {
  const old = pending(); load.mockReturnValueOnce(old.promise); mount();
  load.mockResolvedValueOnce(parentSnapshot({ assignmentSummaries: [{ ...parentTask, title: 'New account task' }] }));
  act(() => prepareParentScope('parent-b')); expect(await screen.findByText('New account task')).toBeInTheDocument();
  await act(async () => old.resolve(parentSnapshot())); expect(screen.queryByText(parentTask.title)).not.toBeInTheDocument();
});
test('a loaded dashboard clears when switching into a child account', async () => {
  mount(); await taskHeading(); act(() => useAuthStore.setState({ profile: { ...useAuthStore.getState().profile!, role: 'child' } }));
  expect(screen.queryByText(parentTask.title)).not.toBeInTheDocument(); expect(screen.getByRole('status')).toHaveTextContent('valid adult account'); expect(load).toHaveBeenCalledTimes(1);
});
test.each(['suspended', 'permission', 'missing-profile'] as const)('a brief %s interruption restarts the view, even when restored in one batch', async failure => {
  const old = pending(); load.mockReturnValueOnce(old.promise); mount(); const profile = useAuthStore.getState().profile!;
  act(() => {
    useAuthStore.setState({ profile: failure === 'missing-profile' ? null : failure === 'suspended' ? { ...profile, status: 'suspended' } : { ...profile, is_authorized: false } });
    useAuthStore.setState({ profile });
  });
  expect(await taskHeading()).toBeInTheDocument(); expect(load).toHaveBeenCalledTimes(2);
  await act(async () => old.resolve(parentSnapshot({ assignmentSummaries: [{ ...parentTask, title: 'Stale hidden task' }] })));
  expect(screen.queryByText('Stale hidden task')).not.toBeInTheDocument();
});
test('same-account profile refresh does not restart or lose the pending read', async () => {
  const next = pending(); load.mockReturnValueOnce(next.promise); mount();
  act(() => useAuthStore.setState({ profile: { ...useAuthStore.getState().profile!, first_name: 'Updated name' } }));
  expect(load).toHaveBeenCalledTimes(1); await act(async () => next.resolve(parentSnapshot())); expect(await taskHeading()).toBeInTheDocument();
});
test('guest Parent Hub uses labelled fictional data and never reads real task records', async () => {
  prepareParentScope('guest-parent', true); mount();
  expect(await screen.findByText(/Fictional demo tasks/)).toBeInTheDocument(); expect(load).not.toHaveBeenCalled();
});
test('switching from a registered account to demo discards a late real response', async () => {
  const old = pending(); load.mockReturnValueOnce(old.promise); mount();
  act(() => prepareParentScope('guest-parent', true)); await screen.findByText(/Fictional demo tasks/);
  await act(async () => old.resolve(parentSnapshot())); expect(screen.queryByText(parentTask.title)).not.toBeInTheDocument();
});
test('a hung read times out, allows retry and ignores its late result', async () => {
  jest.useFakeTimers(); const old = pending(); load.mockReturnValueOnce(old.promise); mount();
  await act(async () => { jest.advanceTimersByTime(PARENT_LOAD_TIMEOUT_MS); });
  expect(screen.getByText('Parent Hub unavailable')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry Parent Hub' })); await taskHeading();
  await act(async () => old.resolve(parentSnapshot({ assignmentSummaries: [{ ...parentTask, title: 'Old timed-out task' }] })));
  expect(screen.queryByText('Old timed-out task')).not.toBeInTheDocument();
});
test('unmount releases the timeout and prevents a late response rendering', async () => {
  jest.useFakeTimers(); const old = pending(); load.mockReturnValueOnce(old.promise); const { unmount } = mount();
  unmount(); expect(jest.getTimerCount()).toBe(0); await act(async () => old.resolve(parentSnapshot()));
  expect(screen.queryByText(parentTask.title)).not.toBeInTheDocument();
});
