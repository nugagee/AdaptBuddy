# Batch 2 — Dysgraphia Trace the Path

## Scope and status

Development branch only: `codex/grant-ready-neuro-tools-batch-2`, draft PR #20. This closes the remaining planned Dysgraphia activity; the existing Writing Pad and Word Bank paths are unchanged. Full CI and manual review remain release gates. No pilot approval or therapeutic benefit is claimed.

## Interaction contract

Three fixed paths (straight, hill, zigzag) have equal alternatives: step buttons that work with tap/keyboard, or pointer drawing with finger/pen/mouse. The default is step buttons; no dragging is required. Exploring one stop or completing one line permits explicit review and recording of **partial practice**. Opening, waiting, stationary contact, an unfinished/cancelled gesture, or checking a box without exploration does not qualify. No speed, neatness, accuracy or clinical score exists. The catalogue's eight minutes is an estimate; completion records measured visible unpaused session time.

Path/method changes and clear discard the open practice and invalidate its review. Undo invalidates review. Explicit pause hides and disables activity controls, retains previously completed exploration, and discards an unfinished stroke. Browser cancellation, lost pointer capture, hidden tabs and window blur discard unfinished strokes. A secondary pointer cannot finish another pointer's stroke. Coordinates are bounded to the surface; memory is capped at 20 strokes of 200 points each. The drawing surface permits pinch-zoom; browser/device behaviour still requires manual verification.

## Privacy and ownership

Drawings, path choice, method and review state stay in component memory, never in local storage, network payloads or completion data. Closing or invalidating the session unmounts that state. Only the existing completion metadata and duration are returned. The actual auth/progress-owner/readiness and Dysgraphia profile are checked at interaction and completion. Subscription-based invalidation latches even if readiness is lost and restored within one batched update. Guests use the existing memory-only guest progress. No AI, microphone, uploaded handwriting, reminders, notifications, database changes or new permissions are introduced.

## Automated evidence

Component tests cover equal alternatives, partial practice, explicit review, reset, pointer cancellation/loss, secondary pointers, bounded memory, keyboard activation, pause/hidden duration, guests, invalid owner/profile/readiness, batched interruptions and stale controls. Dashboard tests exercise the real card, modal, progress store, rewards, measured time, guest scope, closing/focus, paused focus loop and account changes. Catalogue tests verify activation, unique identifiers and honest copy. Exact results are recorded on Issue #18 after the full Actions run; source tests alone are not a passing execution claim.

## Required manual review before release

- iPhone/iPad Safari and Android Chrome: finger, pen where available, mouse, pinch zoom, page scrolling, pointer leaving surface, orientation changes and tab switching.
- Keyboard and screen reader: method/path selection, textual path description, progress announcements, checkbox, focus trap, Escape and restore focus.
- Narrow screens, large text/zoom, light/dark themes, touch target size and contrast.
- Intended-user and appropriate specialist review for wording, usefulness and frustration/effort. These educational exploration tools are not validated treatment.

Production, Worry Diary, live data/migrations, Teacher AI PR #16, Changers and branch deletions are out of scope. Every commit has an individual explanatory comment on Issue #18. The one-off hash-checked integration-preparation workflow is removed in the feature commit; permanent CI permissions remain unchanged.
