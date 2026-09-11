# Honor-inspired Calm Bubble and pronunciation walkthrough

## Scope

The owner supplied an Honor-phone recording and confirmed the intended inspiration: the expanding/shrinking breathing visual and one-control-at-a-time introduction. This implements an original AdaptBuddy interpretation; no Honor graphics, code or branding were copied. The recording has been received: the previous request to show it is fulfilled.

This slice extends draft PR #21 on `codex/pronunciation-audio-feedback`, based on the verified pronunciation upgrade `6a0d391`. The main branch and score arithmetic/history are not changed by this development commit. It adds two launch buttons beside the existing pronunciation shortcuts: **Open Calm Bubble** and **Show me how**. New UI is not automatically production release or pilot approval.

## Calm Bubble contract

- Explicit Start; Pause, Stop and Close. Controls remain outside the scrolling settings/content area. Nothing starts on page load. Optional 1-minute, 2-minute or untimed session; 6/8/10-second visual circle preferences, not prescribed breathing targets.
- The original gradient bubble expands/shrinks smoothly. Prompts invite gentle comfortable breathing with no holds or forced deep breaths. Just watch switches to descriptive bubble prompts. There is no sensor, breathing accuracy, calmness score, completion reward or session persistence.
- Paused/hidden/blur/pagehide time does not consume the selected active time. Returning never automatically restarts. Continue starts a new visual in/out cycle while preserving active-time remainder. Changing setup resets the session. Stop has no penalty.
- Still visual, global Calm Motion and OS reduced motion suppress scale changes; written cues remain. Optional spoken prompts are off by default. Only four fixed cues use voices the browser reports as local English. Missing/busy/failed/delayed voices fall back to the visual/text route, with no remote-voice fallback. Short start/end watchdogs prevent delayed guidance from accumulating.
- Spoken prompts are not a microphone operation. Browser-reported localService is not an independent network audit; global speech cancellation can affect concurrently queued narration while this component owns speech. Real installed-voice and screen-reader interaction still need device review.

## Guided introduction contract

Six skippable/repeatable steps highlight actual marked controls: example playback, recording agreement, record, stop, replay and separate browser word-check choice. Next/Back never click the target or change agreements. The page beneath is inert; the guide explains rather than performing a recording. Finish/Skip/Escape closes the guide and restores valid original-page focus/scroll. Missing targets and very short viewports retain a readable text-only guide instead of a broken spotlight.

Target markers are additions to the existing audio UI; its media implementation and score formulas remain unchanged. The tour uses actual DOM positions, updates on viewport/scroll/target-size changes and gives each step a focusable heading. It temporarily adds scroll room for end-of-page controls, restoring page attributes/styles on close.

## Media and child-session boundary

Before either tool opens, the matching page's media controller must confirm cancellation, deleting the temporary clip. This is explained beside the launch buttons. A failed or throwing stop blocks guidance. Pending microphone permission is cancelled; late granted streams are stopped by the existing controller. A stale registration cannot remove a newer boundary. The callback registry contains no audio/transcript/consent data.

The original authenticated/guest child and ready progress owner must agree. Subscriptions latch interruptions even if readiness is lost/restored in one batched update. Account changes close guidance; new children do not inherit it. No new localStorage/sessionStorage entry, database field, API request, clinical assessment or score/reward is introduced.

## Verification

New model/voice/boundary, interactive bubble and actual Pronunciation Buddy integration tests cover controls, timing, optionality, failures, source-score preservation, real media cancellation, guests, owner changes, focus and repeatability. The final full CI result and exact commit are recorded on Issue #18; tests existing in source alone are not execution evidence.

An isolated Chromium renderer uses these actual components with synthetic account/device boundaries and the project's React runtime. It checks original visuals at desktop/phone sizes, light/dark presentations, actual keyboard/focus, reduced motion, and overlay layout. It is not the deployed whole application or a physical Honor/iPhone test. The temporary read-only review preparation workflow is removed in the feature commit; no permanent CI/dependency change.

## Required release acceptance

- Actual Honor/Android, iPhone/iPad and desktop browser journeys, including voice availability/quality and microphone permission interactions with the existing audio upgrade.
- Intended-user review, keyboard/screen-reader/large-text/zoom/landscape acceptance, shared narration and global music coexistence.
- Specialist review of optional breathing copy and broader privacy/safeguarding/claim consistency. This is not medical treatment, a demonstrated engagement outcome or clinical validation.
- Owner release approval and post-merge deployment verification. PR #21 remains draft until reviewed.

## Context consulted, 11 September 2026

- NHS comfortable, unforced breathing guidance: https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/
- W3C modal focus/inert background pattern: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- W3C reduced-motion technique: https://www.w3.org/WAI/WCAG21/Techniques/css/C39

These inform design decisions; they do not endorse AdaptBuddy or validate this duration/pace selection as a treatment.

Every commit has an explanatory Issue #18 comment. Production, Changers, Worry Diary, Teacher AI PR #16, live data/migrations, saved audio portfolio, secrets/config changes, automatic merge and branch deletion are outside this slice.
