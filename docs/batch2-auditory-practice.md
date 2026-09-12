# Batch 2 — Auditory Processing practice

Development branch only: `codex/grant-ready-neuro-tools-batch-2`, draft PR #20, issue #18. Implementation and automated evidence are not a production release, hearing assessment, therapy validation or pilot approval.

## Implemented activities

**Caption Match Game:** Three original captions, each with three written card labels and decorative symbols. The full transcript is visible by default and can be hidden/restored. Optional device speech reads the same fixed caption. Select, check and explicitly compare before recording one reviewed example. Matching and different answers receive truthful feedback and equal practice credit; no false correct claim, memory/hearing score, timer or generic completion shortcut. Changed answer/example/reset clears old checking and review. This is text/speech-to-card matching, not the previously promised video-clip player.

**Slow & Clear Mode:** Three original examples with three instructions each. One instruction at a time, previous/next, optional overview, static bold/underlined key words and optional speech replay/rate. Read, listen or get help; carrying out the real task is not required. One uniquely acknowledged instruction and explicit review can record partial practice. Viewing/navigating/listening alone never marks an instruction. Changing example/reset clears old acknowledgements; navigating clears final review. Highlighting is not word-synchronised audio tracking.

## Device speech contract and limits

- No autoplay. The child explicitly chooses Play; Stop, replay and rates 0.6/0.75/1.0 are available. These are speech-engine preferences, not guaranteed playback-duration ratios.
- Only English voices which the browser reports as `localService === true` qualify. No remote-voice fallback. Missing APIs/voices/errors have a fully usable text route with equal reward. Late `voiceschanged` and a manual refresh can make installed voices available without autoplay.
- Only twelve allowlisted original texts can reach speech. No profile, journal, answer or other child-entered text is passed. No microphone permission, recognition, app API request or new dependency. Browser/OS voice implementation and actual device behaviour remain outside our direct verification; localService is a browser report, not an independent network audit.
- Stop on pause, hidden tab, blur, example/instruction/rate change, completion, original-child/readiness/profile invalidation and unmount. Resume never auto-plays. Stale callbacks are invalidated. Start and end watchdogs handle silent failures without awarding practice.
- The Web Speech engine is shared: `cancel()` clears its queue, not a single utterance. This tool refuses to start over existing speaking/pending/paused narration and only calls cancellation while it owns an outstanding utterance. Another component queuing speech concurrently can still be affected. Cross-app narration and screen-reader interplay require manual review; no isolation guarantee is claimed. Cancel failure is reported honestly where the UI is still mounted.

## Privacy and progress

Choices, transcript/highlight/rate preferences and instruction acknowledgements remain in component memory and disappear on close/invalidation. Existing completion metadata and measured visible/unpaused monotonic session duration are the only results; neither audio completion nor time implies listening, correct answers or understanding. The Auditory metric is relabelled **Communication practices / sessions**, retaining existing storage/counting but avoiding a false listening claim for text-only use. Existing Listen & Repeat Buddy is unchanged.

Owner/profile/readiness guards latch brief batched interruptions. No old session can resume after an account change. Guests retain the existing transient progress rules. No database fields, migrations, live child data, AI, microphone, notification or safeguarding-rule change.

## Tests and release gates

Controller tests use synthetic device voices (no actual sound) and cover local-only selection, busy engines, allowlist/rates, playback/errors/timeouts, stale callbacks, cancellation and disposal. Component tests exercise real profile/progress stores, optional speech, equal text routes, review/reset, keyboard, pause/hidden timing and account changes. Dashboard tests exercise actual launch, modal/focus, completion/rewards/duration, guest privacy and account switching. Catalogue tests check identifiers, content, daily rotation and honest metrics. Exact full-run counts/results are added to #18 only after execution.

Manual checks remain: iPhone/iPad Safari, Android Chrome and desktop voices; installed/missing/local/remote voice reports; correct English pronunciation and clarity at all rates; stop/replay/tab switching; screen readers and other narration/music; narrow screens, zoom, focus return and large touch targets; intended-user and specialist accessibility/content review. Automated mocked-speech tests do not establish audio quality or hearing benefit.

## Technical references reviewed 11 September 2026

- MDN, SpeechSynthesisVoice.localService: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService
- MDN, SpeechSynthesis (queue, speaking/pending/paused and cancel): https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis
- MDN, voiceschanged: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/voiceschanged_event

These references explain API behaviour, not clinical effectiveness. Temporary integration preparation is removed in the feature commit; ordinary CI remains read-only. Production, Changers, Worry Diary, Teacher AI PR #16, secrets, live data/migrations and branch cleanup are out of scope. Each commit has an explanatory comment on #18.
