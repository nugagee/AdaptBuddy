import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import AssignmentSupportAssistant from './AssignmentSupportAssistant';
import { suggestAssignmentSupport } from '../services/assignmentSupportService';

jest.mock('../services/assignmentSupportService', () => ({ suggestAssignmentSupport: jest.fn() }));
const suggest = suggestAssignmentSupport as jest.MockedFunction<typeof suggestAssignmentSupport>;
const assignment = { classId: 'class-1', title: 'Read a short story', description: 'Read, then write two sentences.', assignmentType: 'reading' as const };
const props = { assignment, selectedTools: ['visual_steps'], isGuest: false, disabled: false, onAddTool: jest.fn() };
beforeEach(() => { jest.clearAllMocks(); suggest.mockResolvedValue(['read_aloud', 'visual_steps']); });

function requestSuggestions() {
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Suggest support tools' }));
}

it('requires a privacy review, generates only on click and waits for explicit teacher selection', async () => {
  render(<AssignmentSupportAssistant {...props} />);
  expect(screen.getByRole('button', { name: 'Suggest support tools' })).toBeDisabled();
  expect(suggest).not.toHaveBeenCalled();
  requestSuggestions();
  await screen.findByRole('button', { name: 'Add read aloud' });
  expect(props.onAddTool).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Visual steps already selected' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Add read aloud' }));
  expect(props.onAddTool).toHaveBeenCalledWith('read_aloud');
  expect(suggest).toHaveBeenCalledTimes(1);
  expect(suggest.mock.calls[0][0]).toEqual(assignment);
});

it('aborts and discards an in-flight result when task details change', async () => {
  let resolve!: (value: string[]) => void;
  suggest.mockImplementation(() => new Promise((done) => { resolve = done; }));
  const { rerender } = render(<AssignmentSupportAssistant {...props} />);
  requestSuggestions();
  const signal = suggest.mock.calls[0][1];
  rerender(<AssignmentSupportAssistant {...props} assignment={{ ...assignment, title: 'A maths task' }} />);
  expect(signal.aborted).toBe(true);
  await act(async () => resolve(['read_aloud']));
  expect(screen.queryByRole('button', { name: 'Add read aloud' })).not.toBeInTheDocument();
  expect(screen.getByRole('checkbox')).not.toBeChecked();
  expect(props.onAddTool).not.toHaveBeenCalled();
});

it('clears completed suggestions when the class changes', async () => {
  const { rerender } = render(<AssignmentSupportAssistant {...props} />);
  requestSuggestions();
  await screen.findByRole('button', { name: 'Add read aloud' });
  rerender(<AssignmentSupportAssistant {...props} assignment={{ ...assignment, classId: 'class-2' }} />);
  expect(screen.queryByRole('button', { name: 'Add read aloud' })).not.toBeInTheDocument();
  expect(screen.getByRole('checkbox')).not.toBeChecked();
});

it('shows an error without applying tools or fabricating a fallback', async () => {
  suggest.mockRejectedValue(new Error('Assignment AI is unavailable.'));
  render(<AssignmentSupportAssistant {...props} />);
  requestSuggestions();
  expect(await screen.findByRole('alert')).toHaveTextContent('Assignment AI is unavailable.');
  expect(props.onAddTool).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Add read aloud' })).not.toBeInTheDocument();
});

it('makes no AI request for guests or long inputs', () => {
  const { rerender } = render(<AssignmentSupportAssistant {...props} isGuest />);
  expect(screen.getByText(/Guest mode does not make AI requests/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Suggest support tools' })).not.toBeInTheDocument();
  rerender(<AssignmentSupportAssistant {...props} assignment={{ ...assignment, description: 'x'.repeat(1601) }} />);
  fireEvent.click(screen.getByRole('checkbox'));
  expect(screen.getByRole('button', { name: 'Suggest support tools' })).toBeDisabled();
  expect(suggest).not.toHaveBeenCalled();
});

it('aborts on unmount and prevents duplicate requests while busy', async () => {
  suggest.mockImplementation(() => new Promise(() => {}));
  const { unmount } = render(<AssignmentSupportAssistant {...props} />);
  requestSuggestions();
  expect(screen.getByRole('button', { name: 'Finding suggestions…' })).toBeDisabled();
  const signal = suggest.mock.calls[0][1];
  unmount();
  expect(signal.aborted).toBe(true);
  expect(suggest).toHaveBeenCalledTimes(1);
});
