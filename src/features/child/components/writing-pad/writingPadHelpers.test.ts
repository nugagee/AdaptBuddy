import {
  getWritingPadStorageKey,
  loadSavedWriting,
  persistWriting,
  WRITING_PAD_STORAGE_KEY_PREFIX,
} from './writingPadHelpers';

describe('writing pad draft storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds a versioned key scoped to the authenticated child id', () => {
    expect(getWritingPadStorageKey('child/a')).toBe(
      `${WRITING_PAD_STORAGE_KEY_PREFIX}:child%2Fa`,
    );
  });

  it.each([undefined, null, '', '   '])(
    'returns a blank draft and does not write without a child id (%p)',
    (childId) => {
      localStorage.setItem('adaptbuddy-writing-pad-save', 'legacy private draft');
      localStorage.setItem('writingPad_lastSave', 'older private draft');

      expect(loadSavedWriting(childId)).toBe('');

      expect(persistWriting(childId, 'must not be written')).toBe(false);

      expect(localStorage.getItem('adaptbuddy-writing-pad-save')).toBe('legacy private draft');
      expect(localStorage.getItem('writingPad_lastSave')).toBe('older private draft');
      expect(localStorage.getItem(`${WRITING_PAD_STORAGE_KEY_PREFIX}:undefined`)).toBeNull();
    },
  );

  it('never falls back to either legacy global draft key', () => {
    localStorage.setItem('adaptbuddy-writing-pad-save', 'child A secret');
    localStorage.setItem('writingPad_lastSave', 'older child A secret');

    expect(loadSavedWriting('child-b')).toBe('');
  });

  it('keeps drafts isolated between authenticated children', () => {
    expect(persistWriting('child-a', 'A private draft')).toBe(true);
    expect(persistWriting('child-b', 'B private draft')).toBe(true);

    expect(loadSavedWriting('child-a')).toBe('A private draft');
    expect(loadSavedWriting('child-b')).toBe('B private draft');
    expect(getWritingPadStorageKey('child-a')).not.toBe(getWritingPadStorageKey('child-b'));
  });

  it('reports a browser storage failure instead of claiming the draft was saved', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is unavailable', 'QuotaExceededError');
    });

    expect(persistWriting('child-a', 'A private draft')).toBe(false);

    setItem.mockRestore();
  });
});
