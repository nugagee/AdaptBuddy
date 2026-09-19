import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import FocusTimerModal from './FocusTimerModal';

const mockAddFocusMinutes = jest.fn();

jest.mock('features/child/store/childProgressReadAccess', () => ({
  // A plain wrapper survives CRA's per-test resetMocks; the spy is reset below.
  getReadyChildProgressForOwner: () => ({
    addFocusMinutes: mockAddFocusMinutes,
  }),
}));

describe('FocusTimerModal session duration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockAddFocusMinutes.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('completes with the duration captured when the timer opened', () => {
    const onComplete = jest.fn();
    const onClose = jest.fn();
    const { rerender } = render(
      <FocusTimerModal
        ownerId="child-a"
        durationMinutes={1 / 60}
        onClose={onClose}
        onComplete={onComplete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start Sprint' }));
    rerender(
      <FocusTimerModal
        ownerId="child-a"
        durationMinutes={30}
        onClose={onClose}
        onComplete={onComplete}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockAddFocusMinutes).toHaveBeenCalledWith(1 / 60);
    expect(onComplete).toHaveBeenCalledWith('child-a', 1 / 60);
  });
});
