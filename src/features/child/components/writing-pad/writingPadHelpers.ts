export type LineSpacing = 'wide' | 'medium' | 'narrow';
export type OverlayColor = 'none' | 'yellow' | 'blue' | 'green';

export const WRITING_PAD_STORAGE_KEY = 'adaptbuddy-writing-pad-save';

export const LINE_SPACING_OPTIONS: { value: LineSpacing; label: string }[] = [
  { value: 'wide', label: 'Wide' },
  { value: 'medium', label: 'Medium' },
  { value: 'narrow', label: 'Narrow' },
];

export const OVERLAY_OPTIONS: { value: OverlayColor; label: string; swatch: string }[] = [
  { value: 'none', label: 'None', swatch: 'bg-white dark:bg-gray-800' },
  { value: 'yellow', label: 'Warm', swatch: 'bg-amber-200' },
  { value: 'blue', label: 'Cool', swatch: 'bg-sky-200' },
  { value: 'green', label: 'Soft', swatch: 'bg-emerald-200' },
];

export function getLineHeight(spacing: LineSpacing): string {
  switch (spacing) {
    case 'wide':
      return '3rem';
    case 'narrow':
      return '2rem';
    default:
      return '2.5rem';
  }
}

export function getOverlayRgba(color: OverlayColor): string {
  switch (color) {
    case 'yellow':
      return 'rgba(251, 191, 36, 0.12)';
    case 'blue':
      return 'rgba(56, 189, 248, 0.12)';
    case 'green':
      return 'rgba(52, 211, 153, 0.12)';
    default:
      return 'transparent';
  }
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function loadSavedWriting(): string {
  try {
    return (
      localStorage.getItem(WRITING_PAD_STORAGE_KEY) ??
      localStorage.getItem('writingPad_lastSave') ??
      ''
    );
  } catch {
    return '';
  }
}

export function persistWriting(content: string): void {
  try {
    localStorage.setItem(WRITING_PAD_STORAGE_KEY, content);
  } catch {
    /* ignore */
  }
}
