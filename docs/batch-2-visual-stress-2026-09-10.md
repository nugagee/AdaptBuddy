# Batch 2: Visual Stress support slice

Date: 10 September 2026
Branch: `codex/grant-ready-neuro-tools-batch-2`
Parent milestone: Issue #18

## Implemented scope

- **Comfort Read Session**: three fixed short passages; child-selected background, text size, font, line spacing, reading width and optional reading ruler; labelled keyboard/touch controls; previous/next line navigation; unique line acknowledgements; passage changes reset progress. At least one acknowledged line is required to record a session.
- **Font & Spacing Lab**: starting/current presentation comparison; a layout adjustment and explicit trial acknowledgement are required to record practice. A new adjustment invalidates the prior acknowledgement. Reset is available.
- **Screen Break** (stable activity ID `visual-break-2020`): optional 20-second timer or untimed pause; start, pause, resume and reset; tab hiding pauses the break and requires deliberate resume; no automatic start, sound, recurring notification or completion on timer expiry. The child explicitly chooses whether to record the break.

The three catalogue entries now render dedicated tools in the existing modal. The modal's generic Mark Complete button is unavailable for these activities. Existing owner/hydration checks remain in place and are repeated immediately before a completion callback. Measured visible session time is handed to the existing progress pipeline instead of presenting the catalogue estimate as actual time spent. Session time is not a measure of attention or a clinical outcome.

## Privacy and scope

Settings and passage/line selections stay in component memory only, disappear on close or account change, and are not shared with AI or stored in a new database table. No free text, voice, microphone, third-party content or diagnostic label is collected by these tools. Existing completion metadata uses the established child-owned/guest-transient progress store. A completion callback contains only measured minutes; it does not include layout preferences or reading choices.

The Screen Break name deliberately avoids treatment or prevention claims. These are child-chosen comfort supports, not diagnosis, therapy, a vision assessment or evidence of improved health. Closing a tool does not award progress. No new penalty or ranking is introduced.

## Automated evidence to verify for the feature commit

Run the complete existing CI pipeline: locked install and dependency immutability, TypeScript, all Jest tests, safeguarding/privacy checks and production build. New suites cover tool gates, live previews, duplicate-line prevention, keyboard acknowledgement, hidden/paused time, explicit break confirmation, reset, timer cleanup, guest use, stale owners, account switching and actual dashboard completion handoff. Existing catalogue tests retain the planned-activity exclusion invariant.

Execution results belong in the explanatory comment for the actual feature commit and in Issue #18. This source document does not assert an unobserved passing run.

## Before production merge

- Check the Vercel preview with registered and guest flows.
- Check all three activities at phone and tablet widths, browser zoom, keyboard-only navigation, focus return and screen-reader labels.
- Confirm readable foreground/background combinations, reduced-motion behaviour and no horizontal overflow on real devices.
- Have the owner review the child-facing wording and completion behaviour.

Automated tests do not replace those checks or establish clinical effectiveness. Production remains unchanged until review.

## Remaining Batch 2 work

Dysgraphia, Dyscalculia, Dyspraxia/DCD, Auditory Processing, Tourette/Tics, Speech & Language/DLD, and Executive Function remain separate open slices. The latter two profiles are not activated by this Visual Stress slice. No claims are made that all of Batch 2 is complete.

No changes to Changers, Worry Diary, Teacher AI PR #16, production secrets, database migrations or unrelated branches. Every commit is accompanied by its explanatory GitHub comment. The temporary checked-blob preparation workflow is removed in the feature commit; normal CI remains read-only.
