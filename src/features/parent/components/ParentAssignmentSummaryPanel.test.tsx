import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Panel, { getParentTaskEvidence } from './ParentAssignmentSummaryPanel';
import { parentTask } from 'testUtils/parentTaskFixtures';

const mount = (props: Partial<React.ComponentProps<typeof Panel>> = {}) => {
  const refresh = jest.fn(); render(<Panel assignments={[parentTask]} available refreshing={false} isDemo={false} onRefresh={refresh} {...props} />); return refresh;
};
test('an unavailable section hides even supplied stale tasks and never reports zero tasks', () => {
  const refresh = mount({ available: false });
  expect(screen.getByText('School-task data unavailable')).toBeInTheDocument();
  expect(screen.queryByText(parentTask.title)).not.toBeInTheDocument(); expect(screen.queryByText(/No school tasks returned/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh school tasks' })); expect(refresh).toHaveBeenCalledTimes(1);
});
test('loading hides earlier details and disables overlapping refresh', () => {
  mount({ refreshing: true }); expect(screen.queryByText(parentTask.title)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Refreshing school tasks/ })).toBeDisabled();
});
test('an available empty result uses limited wording rather than claiming no school work exists', () => {
  mount({ assignments: [] }); expect(screen.getByText('No school tasks returned for this child')).toBeInTheDocument();
  expect(screen.getByText(/unshared tasks or a pending class connection/)).toBeInTheDocument();
});
test('suggested support and recorded support are presented separately', () => {
  mount({ assignments: [{ ...parentTask, supportUsed: ['line_focus'] }] });
  expect(screen.getByText(/Suggested tools:/).parentElement).toHaveTextContent('read aloud');
  expect(screen.getByText(/Recorded support use:/).parentElement).toHaveTextContent('line focus');
});
test('completion does not claim a teacher assessment or mastery', () => {
  mount(); expect(screen.getByText('Marked completed')).toBeInTheDocument();
  expect(screen.getByText(/not a teacher assessment/)).toBeInTheDocument();
});
test('help is a recorded request, not evidence of receipt or a response', () => {
  mount({ assignments: [{ ...parentTask, status: 'needs_help' }] });
  expect(screen.getByText('Help requested')).toBeInTheDocument(); expect(screen.getByText(/does not confirm that a teacher has seen it/)).toBeInTheDocument();
});
test('guest fixtures are clearly labelled, and displayed task count is bounded', () => {
  mount({ isDemo: true, assignments: Array.from({ length: 8 }, (_, index) => ({ ...parentTask, id: `task-${index}` })) });
  expect(screen.getByText(/Fictional demo tasks/)).toBeInTheDocument(); expect(screen.getAllByRole('article')).toHaveLength(6);
  expect(screen.getByText(/Showing 6 of 8 returned task records/)).toBeInTheDocument();
});
test('unavailable evidence is unknown, not zero, and suggested tools never enter recorded use', () => {
  expect(getParentTaskEvidence([parentTask], false)).toEqual({ completed: null, needsHelp: null, recordedTools: [] });
  expect(getParentTaskEvidence([parentTask], true)).toEqual({ completed: 1, needsHelp: 0, recordedTools: [] });
  expect(getParentTaskEvidence([{ ...parentTask, supportUsed: ['line_focus', 'line_focus'] }], true).recordedTools).toEqual(['line_focus']);
});
