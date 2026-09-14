import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import type { ChildTeacherAssignment } from 'features/child/services/childAssignmentService';
import TeacherAssignmentsPanel from './TeacherAssignmentsPanel';

const mockLoad = jest.fn();
const mockSave = jest.fn();
const mockMood = jest.fn();
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useNavigate: () => mockNavigate }));
jest.mock('features/child/services/childAssignmentService', () => ({
  ChildAssignmentService: {
    getAssignments: (...args: unknown[]) => mockLoad(...args),
    saveProgress: (...args: unknown[]) => mockSave(...args),
    saveMoodAfterTask: (...args: unknown[]) => mockMood(...args),
  },
}));
const task: ChildTeacherAssignment = {
  id: 'task-a', classId: 'class-a', title: 'Read a short story', description: 'Read one paragraph.',
  assignmentType: 'reading', supportTools: ['read_aloud'], supportUsed: [],
  createdAt: '2026-09-12T10:00:00Z', status: 'not_started',
};
const speechTask: ChildTeacherAssignment = { ...task, id: 'speech-a', title: 'Practise Hello', description: 'Phrase: Hello there', assignmentType: 'pronunciation', supportTools: ['pronunciation_practice'] };
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const view = (id = 'child-a', celebrate = jest.fn()) => <MemoryRouter><TeacherAssignmentsPanel childId={id} onCelebrate={celebrate} /></MemoryRouter>;
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const ready = () => screen.findByRole('article', { name: task.title });

beforeEach(() => {
  jest.resetAllMocks(); prepareReadyChildScope('child-a', ['adhd']);
  mockLoad.mockResolvedValue([task]); mockSave.mockResolvedValue(undefined); mockMood.mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); clearReadyChildScope(); });

test('shows checking before the confirmed task and never claims an empty inbox while loading', async () => {
  const pending = deferred<ChildTeacherAssignment[]>(); mockLoad.mockReturnValue(pending.promise);
  render(view()); expect(screen.getByRole('status')).toHaveTextContent('Checking for teacher tasks');
  expect(screen.queryByText(/No teacher tasks are available/)).not.toBeInTheDocument();
  await act(async () => { pending.resolve([task]); });
  expect(await ready()).toBeInTheDocument(); expect(mockLoad).toHaveBeenCalledWith('child-a');
});

test('a successful empty result explains approved class access and retains refresh', async () => {
  mockLoad.mockResolvedValue([]); render(view());
  expect(await screen.findByText('No teacher tasks are available to this account right now.')).toBeInTheDocument();
  expect(screen.getByText(/after class access is approved/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled();
});

test('load errors are not empty states and do not display raw backend/private details', async () => {
  mockLoad.mockRejectedValue(new Error('token=private class owner private@example.invalid'));
  render(view()); expect(await screen.findByRole('alert')).toHaveTextContent('could not be checked');
  expect(screen.queryByText(/No teacher tasks are available/)).not.toBeInTheDocument();
  expect(screen.queryByText(/private@example.invalid/)).not.toBeInTheDocument();
  mockLoad.mockResolvedValue([task]); click('Refresh'); expect(await ready()).toBeInTheDocument();
});

test('a failed refresh removes previously loaded task content rather than presenting it as current', async () => {
  render(view()); await ready(); mockLoad.mockRejectedValue(new Error('offline')); click('Refresh');
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
  expect(await screen.findByRole('alert')).toHaveTextContent('does not mean there are no tasks');
});

test('guest mode never loads or saves real teacher tasks', () => {
  prepareReadyChildScope('guest-child'); useAuthStore.setState({ user: null, isGuest: true });
  render(view('guest-child'));
  expect(screen.getByRole('status')).toHaveTextContent('Demo mode');
  expect(mockLoad).not.toHaveBeenCalled(); expect(mockSave).not.toHaveBeenCalled();
});

test.each(['owner', 'loading', 'profile'] as const)('does not load with mismatched %s state', failure => {
  if (failure === 'owner') useChildProgressStore.setState({ ownerId: 'child-b' });
  if (failure === 'loading') useChildProgressStore.setState({ hydrationStatus: 'loading' });
  if (failure === 'profile') useAuthStore.setState({ profile: { ...useAuthStore.getState().profile!, id: 'child-b' } });
  render(view()); expect(screen.getByRole('status')).toHaveTextContent('after your child account is ready');
  expect(mockLoad).not.toHaveBeenCalled();
});

test('initial readiness can recover and then load normally', async () => {
  useChildProgressStore.setState({ hydrationStatus: 'loading' }); render(view());
  expect(mockLoad).not.toHaveBeenCalled();
  act(() => { useChildProgressStore.getState().markReady('child-a'); });
  expect(await ready()).toBeInTheDocument();
});

test('late child A load cannot overwrite child B tasks after switching accounts', async () => {
  const old = deferred<ChildTeacherAssignment[]>(); mockLoad.mockReturnValueOnce(old.promise);
  const { rerender } = render(view());
  const next = { ...task, id: 'task-b', title: 'Child B task' }; mockLoad.mockResolvedValue([next]);
  act(() => { prepareReadyChildScope('child-b', ['adhd']); }); rerender(view('child-b'));
  expect(await screen.findByRole('article', { name: 'Child B task' })).toBeInTheDocument();
  await act(async () => { old.resolve([{ ...task, title: 'Private child A task' }]); });
  expect(screen.queryByText('Private child A task')).not.toBeInTheDocument();
  expect(screen.getByRole('article', { name: 'Child B task' })).toBeInTheDocument();
});

test('brief batched readiness loss invalidates a pending load even after readiness returns', async () => {
  const old = deferred<ChildTeacherAssignment[]>(); mockLoad.mockReturnValueOnce(old.promise); render(view());
  act(() => { useChildProgressStore.setState({ hydrationStatus: 'loading' }); useChildProgressStore.setState({ hydrationStatus: 'ready' }); });
  await act(async () => { old.resolve([task]); });
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Your session changed');
  click('Refresh'); expect(await ready()).toBeInTheDocument();
});

test('same-account profile refresh preserves the pending load and does not lose task state', async () => {
  const pending = deferred<ChildTeacherAssignment[]>(); mockLoad.mockReturnValueOnce(pending.promise); render(view());
  act(() => { useAuthStore.setState({ profile: { ...useAuthStore.getState().profile! } }); });
  await act(async () => { pending.resolve([task]); });
  expect(await ready()).toBeInTheDocument(); expect(mockLoad).toHaveBeenCalledTimes(1);
});

test('StrictMode cleanup rejects the abandoned first request', async () => {
  const old = deferred<ChildTeacherAssignment[]>(); mockLoad.mockReturnValueOnce(old.promise);
  render(<React.StrictMode>{view()}</React.StrictMode>); expect(await ready()).toBeInTheDocument();
  await act(async () => { old.resolve([{ ...task, title: 'Abandoned request' }]); });
  expect(screen.queryByText('Abandoned request')).not.toBeInTheDocument();
});

test('completion is not displayed or celebrated until the save is confirmed', async () => {
  const pending = deferred<void>(); mockSave.mockReturnValue(pending.promise); const celebrate = jest.fn(); render(view('child-a', celebrate)); await ready(); click('Done');
  expect(screen.queryByText('Completed')).not.toBeInTheDocument(); expect(celebrate).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
  await act(async () => { pending.resolve(); });
  expect(await screen.findByText('Completed')).toBeInTheDocument();
  expect(celebrate).toHaveBeenCalledTimes(1); expect(celebrate).toHaveBeenCalledWith(expect.stringContaining('your own task update'));
  expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();
  expect(useChildProgressStore.getState().starsTotal).toBe(0);
});

test('uncertain save preserves the last confirmed status and requires refresh before retry', async () => {
  mockSave.mockRejectedValue(new Error('connection lost')); const celebrate = jest.fn(); render(view('child-a', celebrate)); await ready(); click('Done');
  expect(await screen.findByRole('alert')).toHaveTextContent('could not confirm');
  expect(screen.getByText('Not started')).toBeInTheDocument(); expect(celebrate).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();
  mockLoad.mockResolvedValue([{ ...task, status: 'completed' }]); click('Refresh');
  expect(await screen.findByText('Completed')).toBeInTheDocument(); expect(mockSave).toHaveBeenCalledTimes(1);
});

test('rapid actions across two tasks cannot overlap saves or race refresh', async () => {
  mockLoad.mockResolvedValue([task, { ...task, id: 'task-b', title: 'Second task' }]);
  const pending = deferred<void>(); mockSave.mockReturnValue(pending.promise); render(view()); const first = await ready();
  const second = screen.getByRole('article', { name: 'Second task' });
  act(() => {
    fireEvent.click(within(first).getByRole('button', { name: 'Done' }));
    fireEvent.click(within(second).getByRole('button', { name: 'Start' }));
  });
  expect(mockSave).toHaveBeenCalledTimes(1); expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
  await act(async () => { pending.resolve(); });
});

test('Done does not invent pronunciation tool use from a suggested support', async () => {
  mockLoad.mockResolvedValue([speechTask]); render(view()); await screen.findByRole('article', { name: speechTask.title }); click('Done');
  await screen.findByText('Completed');
  expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ assignmentId: 'speech-a', status: 'completed', supportUsed: [] }));
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('help is recorded without claiming teacher receipt or notification', async () => {
  render(view()); await ready(); click('Need help');
  expect(await screen.findByText(/does not confirm your teacher has seen it/)).toBeInTheDocument();
  expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ status: 'needs_help', supportUsed: ['teacher_help'] }));
});

test('pronunciation handoff navigates only after a confirmed in-progress save', async () => {
  mockLoad.mockResolvedValue([speechTask]); const pending = deferred<void>(); mockSave.mockReturnValue(pending.promise);
  render(view()); await screen.findByRole('article', { name: speechTask.title }); click('Practise');
  expect(mockNavigate).not.toHaveBeenCalled(); await act(async () => { pending.resolve(); });
  expect(mockNavigate).toHaveBeenCalledWith('/pronunciation-buddy', { state: { assignmentPractice: { assignmentId: 'speech-a', title: 'Practise Hello', phrase: 'Hello there', hint: 'Phrase: Hello there' } } });
});

test('failed pronunciation start neither navigates nor displays success', async () => {
  mockLoad.mockResolvedValue([speechTask]); mockSave.mockRejectedValue(new Error('offline')); render(view());
  await screen.findByRole('article', { name: speechTask.title }); click('Practise');
  await screen.findByRole('alert'); expect(mockNavigate).not.toHaveBeenCalled();
});

test('late save after a child switch cannot navigate or celebrate in the next account', async () => {
  mockLoad.mockResolvedValue([speechTask]); const pending = deferred<void>(); mockSave.mockReturnValue(pending.promise);
  const celebrate = jest.fn(); const { rerender } = render(view('child-a', celebrate));
  await screen.findByRole('article', { name: speechTask.title }); click('Practise');
  act(() => { prepareReadyChildScope('child-b'); }); mockLoad.mockResolvedValue([]); rerender(view('child-b', celebrate));
  await act(async () => { pending.resolve(); });
  expect(mockNavigate).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled();
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
});

test('brief batched invalidation rejects a pending completion, even if the same child returns', async () => {
  const pending = deferred<void>(); mockSave.mockReturnValue(pending.promise); const celebrate = jest.fn(); render(view('child-a', celebrate)); await ready(); click('Done');
  act(() => { useChildProgressStore.setState({ hydrationStatus: 'loading' }); useChildProgressStore.setState({ hydrationStatus: 'ready' }); });
  await act(async () => { pending.resolve(); });
  expect(celebrate).not.toHaveBeenCalled(); expect(screen.queryByText('Completed')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Your session changed');
});

test('unmount while saving never delivers a late celebration', async () => {
  const pending = deferred<void>(); mockSave.mockReturnValue(pending.promise); const celebrate = jest.fn(); const { unmount } = render(view('child-a', celebrate)); await ready(); click('Done'); unmount();
  await act(async () => { pending.resolve(); }); expect(celebrate).not.toHaveBeenCalled();
});

test('optional feeling is explained, saved separately, and does not repeat completion or celebration', async () => {
  const celebrate = jest.fn(); render(view('child-a', celebrate)); await ready(); click('Done');
  await screen.findByText('Completed'); expect(screen.getByText(/shares it with adults authorised/)).toBeInTheDocument(); click('Calm');
  expect(await screen.findByText('Your optional task feeling was saved.')).toBeInTheDocument();
  expect(mockMood).toHaveBeenCalledWith({ assignmentId: 'task-a', childId: 'child-a', moodAfterTask: 'calm' });
  expect(mockSave).toHaveBeenCalledTimes(1); expect(celebrate).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'Calm' })).not.toBeInTheDocument();
});

test('failed optional feeling keeps retry and skip available without losing completion', async () => {
  mockLoad.mockResolvedValue([{ ...task, status: 'submitted' }]); mockMood.mockRejectedValueOnce(new Error('offline'));
  render(view()); await ready(); click('Share how it felt (optional)'); click('Good');
  expect(await screen.findByRole('alert')).toHaveTextContent('try again or skip');
  expect(screen.getByText('Submitted')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Good' })).toBeEnabled();
  click('Good'); await screen.findByText('Your optional task feeling was saved.');
  expect(mockMood).toHaveBeenCalledTimes(2); expect(mockSave).not.toHaveBeenCalled();
});

test('skipping the optional feeling writes nothing and cannot reopen a completed task', async () => {
  mockLoad.mockResolvedValue([{ ...task, status: 'completed' }]); render(view()); await ready();
  click('Share how it felt (optional)'); click('Skip for now');
  expect(mockMood).not.toHaveBeenCalled(); expect(mockSave).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled(); expect(screen.getByText('Completed')).toBeInTheDocument();
});
