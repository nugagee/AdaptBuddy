# Batch 2 — Dyspraxia/DCD placement and movement-card exploration

Development branch `codex/grant-ready-neuro-tools-batch-2`, draft PR #20, tracked on #18. Implementation and automated checks are separate from production release, clinical review and approval for a child/school pilot.

## Fine Motor Mission

Three fixed boards (space, garden, shapes), each with three written piece labels and optional decorative symbols. Select a piece, then select a destination using large tap/keyboard buttons. No drag, precision, speed or bilateral-hand requirement. Multiple pieces can share a destination; no arrangement is marked wrong. One actual placed piece plus explicit review records partial digital placement practice. Selecting a piece, browsing, waiting or opening the tool does not qualify. Undo (last 30 changes), return to tray, clear, board reset and one-piece-at-a-time view are supported. Moving/selecting/resetting clears the prior review. No promise of improved motor skills is made.

## Gross Motor Galaxy

Default is **Read or imagine**. Three short original cards describe a small wave, gentle seated foot taps, or hands moving a little together/apart. Reading, imagining, resting and choosing help earn the same card-exploration credit as choosing to try a comfortable seated action. One explicitly explored step, a chosen participation response and final review record **card exploration**, not proof of movement performed.

Optional seated mode requires three separate acknowledgements: an adult is present and checked suitability; the child is in their usual supported seat with clear space; and the child is comfortable and knows not to push through pain. These are self-reported UX checks, **not verified adult approval, medical screening or proof of safety**. The UI defers to existing care-team advice and directs the child to read-only/stop if unsure, unwell, dizzy, in pain or uncomfortable. No standing, balancing, jumping, equipment changes, exercise prescription, repetitions, timed challenge or intensity progression.

Changing the card or participation mode clears previous checks/practice/review. Withdrawing a safety acknowledgement closes the open card. Explicit pause, hidden tab or window blur returns seated mode to read-only and requires fresh checks before another seated attempt. **Stop — I need rest or help** remains available during pause, awards nothing, clears the open practice and locks seated actions off for the rest of that launch. A subsequent explicit read-only exploration is still possible. No notification is sent; the message tells the child to speak to an adult directly.

## Ownership, privacy and reporting

Current auth/profile/progress owner and readiness are verified at launch and interaction. Synchronous store subscriptions latch account/readiness/profile invalidation even within a batched interruption. Switching tool IDs cannot revive an old review. Hidden/paused/stale completion is rejected; completion is once per mounted launch, and the existing store de-duplicates each activity per day.

Arrangements, explored steps, participation choices and safety acknowledgements remain in component memory and are discarded on close/invalidation. Only the existing completion metadata and measured visible, unpaused **session** duration leave the component. This duration is not exercise time. No camera, microphone, AI/network calls, movement telemetry, new data fields or database migration.

A narrow store exclusion prevents the two new activities from inflating the existing **Plans practised** metric. A separate owner-scoped summary derives placement/card counts from today's existing completion records. Existing Step-by-Step Planner component, structured results and prior history remain unchanged.

## Evidence and manual release gates

Component tests cover real keyboard controls, placement/undo/reset, read/rest/help equality, safety checks, stop/paused/hidden behaviour, account changes and stale/batched interruptions. Real dashboard tests cover catalogue/modal launch, actual rewards, measured duration, guest scope, focus/Escape and reporting. Additional tests protect catalogue identifiers, daily rotation, filtering and metric integrity. Exact executed CI totals and artifacts are recorded on #18 after verification; test source is not evidence of a passing run.

Before release: real phone/tablet and keyboard/screen-reader testing, narrow screens and text zoom, contrast/touch targets and focus transitions, and intended-user plus appropriately qualified occupational-therapy/physiotherapy review of wording, suitability and opt-out design. No professional review or clinical effectiveness is claimed by this commit. Production, Worry Diary, Teacher AI, Changers, live migrations and branch cleanup remain out of scope. Every commit has an individual explanatory comment on #18.

## Contextual source, not validation of these activities

NHS, Developmental co-ordination disorder (dyspraxia) in children — Treatment: https://www.nhs.uk/conditions/developmental-coordination-disorder-dyspraxia/treatment/ (consulted 10 September 2026). Guidance describes individualised, task-oriented support and adaptations. It does not validate this app, these particular cards or any claimed treatment effect. The original cards above deliberately avoid prescribing a therapeutic programme.
