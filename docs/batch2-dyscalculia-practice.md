# Batch 2 — Dyscalculia pattern and everyday-maths practice

## Scope

Development branch `codex/grant-ready-neuro-tools-batch-2`, draft PR #20, Issue #18. Implements the two remaining planned Dyscalculia activities. Existing Number Line component and structured results are retained. Full CI, device/accessibility review and owner review remain release gates; implementation is not pilot approval or clinical validation.

## Pattern Block Puzzle

Three fixed examples: repeating Circle/Square, repeating Circle/Circle/Triangle, and growing counter groups 1–6. Text names and numerals accompany symbols/counters; colour is not an answer cue. Children choose each of two missing blocks using buttons, optionally request a hint, check their chosen continuation, and explicitly acknowledge comparison with the worked example. Feedback distinguishes a matching continuation from a different pattern. Both can record reviewed practice; hints and incorrect answers do not reduce the existing practice reward. One checked/reviewed example is enough; this does not claim all examples were solved. Changing an answer/example and resetting invalidates review.

## Kitchen Math Story

Three original on-screen stories: 2 cups + 3 cups = 5 cups; 6 fruit pieces − 2 pieces = 4 pieces; 1 equal measure + 2 measures = 3 measures in a pretend jug holding 4 equal measures. A measure is explicitly one quarter of this pretend jug, not millilitres or a real recipe. No food, water, equipment or cooking is required.

Bounded one-at-a-time counters start at the story's starting amount; they do not automatically fill the answer. An empty model and answer zero are supported. The child may select a quantity directly or use their model count, request a hint, use a one-step narrative view, check, and confirm comparison with the worked arithmetic. Different quantities receive clear corrective explanation without shame. An answer/model/story change invalidates stale checks/reviews. Review of one story records practice, not verified mastery.

## Privacy, duration and ownership

Answers, model positions, hints and correctness remain in the open component. Only existing activity completion metadata plus measured visible, unpaused duration leave it. No new persistent data fields, database migrations, network calls, AI, microphone or adult notifications. Pausing retains choices but hides/disables practice controls; hidden/paused completion is rejected. Subscription-based original-child/profile/readiness invalidation latches brief batched interruptions. Switching activities without remounting cannot transfer choices. Completion is once per launch, with the existing store preventing duplicate same-day rewards.

## Honest reporting

New practices must not increment the old generic `Math answers / correct` metric. A narrow store exclusion prevents this while leaving the Number Line's structured correctness handling intact. A separately labelled, owner-scoped pattern/story summary derives counts from today's existing completion records. It explicitly describes reviewed practice, not correct answers. No answers or correctness are fabricated from activity completion.

## Verification

Automated suites cover all worked examples, token labels, zero/bounds, choice/reset rules, both completion outcomes, hints, keyboard use, pause/hidden duration, guest privacy, stale/batched ownership, real dashboard routing/rewards, exact daily rotation and accuracy-metric isolation. Exact executed suite/test counts, run IDs and artifacts are recorded on #18 after inspection; test source alone is not passing execution evidence.

Required manual review: phone/tablet portrait/landscape, text zoom, long labels, equal-measure visual layout, contrast, keyboard focus/return, screen-reader announcements and actual child/intended-user usefulness. Educational practice, not diagnosis, therapy, assessment or proven intervention.

All commits require individual explanatory comments. The one-off hash-checked integration-preparation workflow is removed in the feature commit; ordinary CI stays read-only. Production, Changers, Worry Diary, Teacher AI PR #16, live data/migrations and branch deletion are out of scope.
