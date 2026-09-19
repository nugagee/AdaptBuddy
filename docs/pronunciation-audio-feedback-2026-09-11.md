# Pronunciation Buddy — audio, replay, score clarity and motion

Fresh branch: `codex/pronunciation-audio-feedback`, based on main `fdcab8b`. Issue #18. Owner asked to **retain the existing scores for encouragement**, fix the microphone controls, support hearing the child's own try, and animate the four icons gently. This is not authority to enable saved recording portfolios, a database migration or a production merge.

## Implemented contract

The four former information cards are keyboard/touch buttons: Hear it plays the current example; Say it focuses the audio choices without requesting a microphone; Try again clears the current media/feedback while preserving earlier scores; Keep words focuses the word-bank input. The large microphone also opens the controls rather than masquerading as an active microphone.

The audio studio separates three operations:

1. **Example voice:** explicit Slow/Normal; no microphone consent required; only English voices reported by the browser as local. A missing voice has a written explanation and manual refresh; no remote fallback or autoplay. Device speed preferences are not guaranteed playback ratios. Shared browser speech queue limitations remain: the component cancels only speech it owns and refuses to start over existing narration, but other components queuing narration concurrently can still be affected.
2. **Temporary recording and replay:** separate visit-only agreement, then explicit Record my try and browser permission. A requested permission is not labelled recording. The recording indicator follows the recorder start event. Stop releases microphone tracks and prepares an in-memory clip; replay is explicit and never sends the clip to a scoring service. One clip, at most 30 seconds/4 MiB, supported MIME negotiation with browser default fallback, Stop/Cancel/Delete controls. An unanswered permission request can be cancelled or time out; any late granted stream is immediately stopped. Late data/result events cannot resurrect discarded state.
3. **Optional browser word checking:** separate opt-in disclosing possible off-device processing by the browser. It does not receive the temporary replay clip. A microphone-capture event, not a saved agreement, controls the active indicator. Permission denial, no device, busy device, network/no-speech/unsupported errors receive distinct guidance. Only final, nonempty recognised words can produce a new existing word-match score; errors, missing words and replay alone do not add scores.

Agreements are not saved across visits and old `mic-consent` flags no longer activate capture. Browser permissions remain browser-controlled. New record replaces the old clip. Delete/reset, item/phrase/account change, hidden page, navigation/unmount and invalidated child ownership/readiness stop media and clear temporary clips. Permission dialogs may blur a page; pending permission is not discarded merely because that dialog took focus. Active playback/capture stops on blur. Returning never resumes media automatically.

Original-child/readiness checks are re-evaluated at action/callback time. Synchronous store subscriptions latch even brief batched readiness/account interruptions. Initial hydration may become ready without being mistaken for a previously active invalidated session. No new app API call, live child data read, database field, persistent clip, microphone background loop or audio upload is introduced. Raw recognition text is transient and is not written into the existing history or summaries. Browser/OS implementations are not independently network-audited by these tests.

## Scores retained, not represented as clinical assessment

Existing score arithmetic is unchanged: private confident/practised/hard choices retain 88/72/52, help retains 30, and the browser text-match algorithm is retained. Numeric history and Best displays are retained. Self-checks are labelled **Self-check encouragement score**, microphone results **Browser word-match score**, and help **Support check-in score**. Summaries preserve numbers and explain their different sources. A mixed score trend must not be described as measured pronunciation improvement. The app does not infer speech clarity from a string match. Starting zero is explained as no recorded practice, not a measured inability.

Existing guest transient-history rules, registered device-local history, word bank, private self-check, routing/rewards and teacher-assignment verification remain. Recording/replay do not automatically mark teacher work or award extra scores. A persistent audio portfolio and verified parent/teacher access require a separate design/permission/storage review; neither is claimed delivered here.

## Motion and review

Four icons have brief interaction-triggered motion, not continuous idle bouncing or fake audio waveforms. Real capture has a short status transition with visible text. All function with motion off. Both OS `prefers-reduced-motion` and AdaptBuddy Calm Motion suppress decorative motion; the page offers the existing global Calm Motion switch. These are code-level provisions, not a completed physical-device accessibility assessment.

Automated tests use synthetic streams, recorders, voices and recognition events: they do not establish microphone hardware, audio quality, browser support on every device, recognition accuracy, clinical effectiveness or improved outcomes. Exact executed results belong in Issue #18/PR after the full run.

### Manual acceptance still required

- Honor/Android and iPhone/iPad/desktop: actual permissions, denial/retry, headphones/volume, available codecs, recording/stop/replay/delete, interrupted recording and tab changes.
- Local English voice availability, pronunciation at both rates, failed playback, screen-reader/shared narration and music interaction.
- Keyboard, touch, narrow layout, zoom, Calm Motion and OS reduced motion; child-facing wording and cognitive load.
- Intended-user and appropriate specialist review; no clinical/pilot-approval claim.
- **Next owner review: remind Bamidele to show the feature he saw on his Honor phone (screenshot or short screen recording). The example is not yet known and has not been replicated.** This is a project follow-up item, not a scheduled external notification.

## Technical references reviewed 11 September 2026

- https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
- https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/dataavailable_event
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/audiostart_event
- https://www.w3.org/WAI/WCAG21/Techniques/css/C39.html

Every commit receives an explanatory Issue #18 comment. Main, Changers, Worry Diary, Teacher AI PR #16, live database/migrations, deployment configuration and branch deletion are outside this change. Temporary preparation workflows are removed before the final feature tree; normal CI remains read-only.
