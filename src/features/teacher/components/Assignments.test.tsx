import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Assignments from './Assignments';
import { TeacherDashboardService } from '../services/teacherDashboardService';
import { suggestAssignmentSupport } from '../services/assignmentSupportService';

jest.mock('hooks/useAuth', () => ({ useAuth: () => ({ isGuest: false, user: { id: 'teacher-1' } }) }));
jest.mock('./TeacherHubNav', () => () => null);
jest.mock('../services/teacherDashboardService');
jest.mock('../services/assignmentSupportService', () => ({ suggestAssignmentSupport: jest.fn() }));

it('adds the reviewed AI choice to the draft and publishes it only with the normal publish button', async () => {
  (TeacherDashboardService.getDashboardSummary as jest.Mock).mockResolvedValue({ classes: [{ id: 'class-1', className: 'Reading class' }], assignments: [] });
  (TeacherDashboardService.createAssignment as jest.Mock).mockResolvedValue({ title: 'Read a story', classId: 'class-1' });
  (suggestAssignmentSupport as jest.Mock).mockResolvedValue(['read_aloud']);
  render(<MemoryRouter><Assignments /></MemoryRouter>);
  fireEvent.change(await screen.findByRole('textbox', { name: 'Assignment title' }), { target: { value: 'Read a story' } });
  fireEvent.click(screen.getByRole('checkbox', { name: /I have removed names/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Suggest support tools' }));
  await screen.findByRole('button', { name: 'Add read aloud' });
  expect(screen.getByRole('checkbox', { name: 'Read aloud' })).not.toBeChecked();
  expect(TeacherDashboardService.createAssignment).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Add read aloud' }));
  expect(screen.getByRole('checkbox', { name: 'Read aloud' })).toBeChecked();
  expect(TeacherDashboardService.createAssignment).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Publish assignment' }));
  await waitFor(() => expect(TeacherDashboardService.createAssignment).toHaveBeenCalledWith({ classId: 'class-1', title: 'Read a story', description: '', assignmentType: 'reading', supportTools: ['visual_steps', 'read_aloud'], dueAt: undefined }));
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Assignment title' })).toHaveValue(''));
  expect(screen.queryByRole('button', { name: 'Add read aloud' })).not.toBeInTheDocument();
});
