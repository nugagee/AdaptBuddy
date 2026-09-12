/** One page-local stop boundary; contains no recordings, transcripts or consent. */
let boundary: { ownerId: string | null; stop: () => boolean } | null = null;

export function registerGuidanceMediaBoundary(ownerId: string | null, stop: () => boolean) {
  const registration = { ownerId, stop };
  boundary = registration;
  return () => { if (boundary === registration) boundary = null; };
}

export function preparePracticeGuidance(ownerId: string | null): boolean {
  if (!ownerId || !boundary || boundary.ownerId !== ownerId) return false;
  try { return boundary.stop() === true; } catch { return false; }
}
