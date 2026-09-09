export function toggleSupportPreference(selected: string[], neuroId: string): string[] {
  if (selected.includes(neuroId)) {
    return selected.filter((id) => id !== neuroId);
  }

  return [...selected, neuroId];
}
