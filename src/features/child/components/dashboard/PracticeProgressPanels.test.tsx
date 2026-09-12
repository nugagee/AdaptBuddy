import React from 'react';
import { render, screen } from '@testing-library/react';
import DysgraphiaWordBankProgressPanel from './DysgraphiaWordBankProgressPanel';
import SensoryComfortProgressPanel from './SensoryComfortProgressPanel';

const mockProgressState = {
  dysgraphiaWordBankSessions: [] as Array<Record<string, unknown>>,
  sensoryComfortSessions: [] as Array<Record<string, unknown>>,
};
let mockProgressReady = true;

jest.mock('features/child/store/childProgressStore', () => ({
  useChildProgressStore: (selector: (state: typeof mockProgressState) => unknown) =>
    selector(mockProgressState),
}));

jest.mock('features/child/store/childProgressReadAccess', () => ({
  useChildProgressReadAccess: () => ({
    childId: mockProgressReady ? 'child-a' : null,
    isReady: mockProgressReady,
  }),
}));

const today = () => new Date().toISOString();
const yesterday = () => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString();
};

describe('practice progress panels', () => {
  beforeEach(() => {
    mockProgressReady = true;
    mockProgressState.dysgraphiaWordBankSessions = [];
    mockProgressState.sensoryComfortSessions = [];
  });

  it('shows only today’s latest fixed-vocabulary sentence and neutral Dysgraphia facts', () => {
    mockProgressState.dysgraphiaWordBankSessions = [
      {
        id: 'session-today',
        activityId: 'dysgraphia-word-bank',
        promptId: 'ask-for-help',
        promptTitle: 'Ask for help',
        selectedWordIds: ['please', 'help', 'me', 'question-mark'],
        selectedWords: ['Please', 'help', 'me', '?'],
        editsMade: 4,
        checksMade: 1,
        supportsUsed: ['fixed word bank', 'sentence check'],
        confidence: 'practised',
        createdAt: today(),
      },
      {
        id: 'session-yesterday',
        activityId: 'dysgraphia-word-bank',
        promptId: 'old',
        promptTitle: 'Old prompt',
        selectedWordIds: ['old'],
        selectedWords: ['Old sentence'],
        editsMade: 1,
        checksMade: 0,
        supportsUsed: ['fixed word bank'],
        confidence: 'confident',
        createdAt: yesterday(),
      },
    ];

    render(<DysgraphiaWordBankProgressPanel />);

    expect(screen.getByRole('heading', { name: 'Ask for help' })).toBeInTheDocument();
    expect(screen.getByText('Please help me?')).toBeInTheDocument();
    expect(screen.queryByText('Old sentence')).not.toBeInTheDocument();
    expect(screen.getByText('fixed word bank')).toBeInTheDocument();
    expect(screen.getByText(/does not assess, diagnose, compare or rank writing ability/i)).toBeInTheDocument();
  });

  it('shows today’s selected sensory support and child-chosen comfort descriptions', () => {
    mockProgressState.sensoryComfortSessions = [
      {
        id: 'sensory-today',
        activityId: 'spd-sensory-checklist',
        selections: [
          { area: 'sight', comfort: 'comfortable' },
          { area: 'sound', comfort: 'a-bit-much' },
          { area: 'touch', comfort: 'need-change' },
          { area: 'movement', comfort: 'comfortable' },
        ],
        supportChoiceId: 'quiet-space',
        supportChoiceLabel: 'Take a quiet-space break',
        supportsUsed: ['comfort choices', 'quiet-space break'],
        confidence: 'need-more-time',
        createdAt: today(),
      },
    ];

    render(<SensoryComfortProgressPanel />);

    expect(screen.getByRole('heading', { name: 'Take a quiet-space break' })).toBeInTheDocument();
    expect(screen.getByText(/next choice: would like more time/i)).toBeInTheDocument();
    expect(screen.getByText(/sound:/i).parentElement).toHaveTextContent('A bit much right now');
    expect(screen.getByText('quiet-space break')).toBeInTheDocument();
    expect(screen.getByText(/not a sensory assessment, diagnosis, comparison or ranking/i)).toBeInTheDocument();
  });

  it('does not reveal stored session details before owner-scoped progress is ready', () => {
    mockProgressReady = false;
    mockProgressState.dysgraphiaWordBankSessions = [
      {
        promptTitle: 'Hidden prompt',
        selectedWords: ['Hidden sentence'],
        checksMade: 1,
        supportsUsed: ['hidden support'],
        createdAt: today(),
      },
    ];
    mockProgressState.sensoryComfortSessions = [
      {
        supportChoiceLabel: 'Hidden comfort choice',
        selections: [],
        supportsUsed: ['hidden support'],
        confidence: 'ready-to-continue',
        createdAt: today(),
      },
    ];

    render(
      <>
        <DysgraphiaWordBankProgressPanel />
        <SensoryComfortProgressPanel />
      </>,
    );

    expect(screen.queryByText('Hidden sentence')).not.toBeInTheDocument();
    expect(screen.queryByText('Hidden comfort choice')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Word Bank Practice' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sensory Comfort Practice' })).toBeInTheDocument();
  });
});
