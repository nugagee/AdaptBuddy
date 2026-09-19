import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WritingPadPage from './WritingPadPage';

const mockUseAuth = jest.fn();
const mockGetReadyChildProgressForOwner = jest.fn();

jest.mock('hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('features/child/store/childProgressReadAccess', () => {
  const actual = jest.requireActual('features/child/store/childProgressReadAccess');
  return {
    ...actual,
    getReadyChildProgressForOwner: (...args: unknown[]) =>
      mockGetReadyChildProgressForOwner(...args),
  };
});

jest.mock('features/child/components/writing-pad/WritingPad', () => ({
  __esModule: true,
  default: ({ onSave }: { onSave: (result: unknown) => void }) => (
    <div>
      <button
        type="button"
        onClick={() => onSave({
          ownerId: 'child-a',
          wordCount: 3,
          hadSessionContribution: true,
        })}
      >
        Save meaningful writing
      </button>
      <button
        type="button"
        onClick={() => onSave({
          ownerId: 'child-a',
          wordCount: 3,
          hadSessionContribution: false,
        })}
      >
        Save unchanged writing
      </button>
    </div>
  ),
}));

const childAuth = (neuroTypes: string[] = ['dysgraphia']) => ({
  user: { id: 'child-a' },
  isGuest: false,
  profile: {
    id: 'child-a',
    role: 'child',
    neuro_types: neuroTypes,
  },
});

describe('WritingPadPage routed completion', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockGetReadyChildProgressForOwner.mockReset();
    mockUseAuth.mockReturnValue(childAuth());
  });

  const renderPage = (entry: string) => render(
    <MemoryRouter initialEntries={[entry]}>
      <WritingPadPage />
    </MemoryRouter>,
  );

  it('credits only meaningful new work using trusted catalogue metadata', () => {
    const completeActivity = jest.fn();
    mockGetReadyChildProgressForOwner.mockReturnValue({ completeActivity });
    renderPage('/writing-pad?activity=dysgraphia-voice-story&stars=999');

    fireEvent.click(screen.getByRole('button', { name: 'Save unchanged writing' }));
    expect(completeActivity).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Save meaningful writing' }));
    expect(mockGetReadyChildProgressForOwner).toHaveBeenCalledWith('child-a');
    expect(completeActivity).toHaveBeenCalledWith(
      'dysgraphia-voice-story',
      'dysgraphia',
      5,
      12,
    );
  });

  it.each([
    '/writing-pad',
    '/writing-pad?activity=not-real',
    '/writing-pad?activity=spd-soundscape',
  ])('does not credit an untrusted launch: %s', (entry) => {
    const completeActivity = jest.fn();
    mockGetReadyChildProgressForOwner.mockReturnValue({ completeActivity });
    renderPage(entry);
    fireEvent.click(screen.getByRole('button', { name: 'Save meaningful writing' }));
    expect(completeActivity).not.toHaveBeenCalled();
  });

  it('does not credit an activity outside the child profile', () => {
    mockUseAuth.mockReturnValue(childAuth(['autism']));
    const completeActivity = jest.fn();
    mockGetReadyChildProgressForOwner.mockReturnValue({ completeActivity });
    renderPage('/writing-pad?activity=dysgraphia-voice-story');
    fireEvent.click(screen.getByRole('button', { name: 'Save meaningful writing' }));
    expect(completeActivity).not.toHaveBeenCalled();
  });

  it('fails closed when the progress store owner is stale', () => {
    mockGetReadyChildProgressForOwner.mockReturnValue(null);
    renderPage('/writing-pad?activity=dysgraphia-voice-story');
    fireEvent.click(screen.getByRole('button', { name: 'Save meaningful writing' }));
    expect(mockGetReadyChildProgressForOwner).toHaveBeenCalledWith('child-a');
  });
});
