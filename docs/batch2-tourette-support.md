# Batch 2 — Tourette/Tics support

Development branch only: `codex/grant-ready-neuro-tools-batch-2`; issue #18 and draft PR #20. Implementation and passing automation are not release approval or clinical validation.

## Flex Flow Session

Three scenes (Space, Garden, Cosy room), each with three fixed labelled cards. Add/repeat/reorder/remove up to six cards using large tap/keyboard controls; no drag, speed, correctness or tic-suppression task. Undo keeps at most twenty changes during the open activity. One added card plus explicit review records partial creative practice. Editing, undo, pause or showing the break card clears final review, not the chosen scene. There is no need to finish every card or prove calmness.

The small draft automatically stays in memory in this **same JavaScript tab** while the original child account, role, profile and ready progress owner still agree. It can survive closing/reopening this modal, but not page refresh, sign-out, changing child, losing readiness or removing the support profile. Synchronous subscriptions invalidate the cached draft and its generation even during briefly batched changes and while no modal is mounted. Guest drafts have the same transient boundary. No localStorage, sessionStorage, database or network saving. Shape validation, bounded indices, defensive copies and whitelisted fields prevent arbitrary data from entering the cache. An explicit erase control clears it; recording or finishing a repeat practice clears it. Review, undo history and previous elapsed time are not restored on reopening. UI and catalogue explain these limits rather than promising durable autosave.

## Tic Break Pass

The default support card can be shown immediately, including from a paused or empty Flex Flow Session. No reason, symptom report or earned stars are required. Three fixed messages request time, quiet space or adult help; they do not disclose a diagnosis. The card is meant to be shown to a person nearby. It sends **no message**, gives **no official permission to leave**, and directs the child to their agreed break arrangements with a trusted adult.

There is no countdown, forced return, requirement to stop tics, calmness score or reward for suppressing symptoms. The child may close the card without recording anything. Standalone optional recording requires showing the selected card, returning, and explicitly reviewing its use. That records support-card exploration/use, not an actual approved break or adult response. Changing wording invalidates prior showing/review. Wording remains component-local and disappears on close. An embedded card never awards a separate break completion. A card opened while paused returns to paused state.

## Repeated access is separate from rewards

Both new tools retain a **Use support tool again** button after the first daily completion, alongside the existing completed badge. This narrow exception applies only to these two exact Tourette support identifiers and preserves original child-owner checks. Other completed activities retain their existing launch policy, and explicitly planned activities cannot be reopened.

The existing once-per-day activity recording/reward rule stays unchanged. Completing a repeated use returns to the dashboard with a truthful message that no extra stars were added. It does not duplicate the completion, duration, metrics or reward. Support remains usable regardless of whether its optional daily record already exists. Real dashboard tests cover registered and guest repeats and confirm the original records remain unchanged. The catalogue display still shows its original activity estimate/reward metadata; these are not required break durations or rewards for suppressing tics.

## Time, privacy and boundaries

Only existing completion metadata and monotonic visible, unpaused **active tool time in this launch** leave the component for the first daily record. Paused time and time showing the break card are excluded; no break duration or symptom outcome is recorded. Hidden tabs/window blur pause active work and do not auto-resume it. Original-child/readiness/profile changes latch expiration, including transient batched changes. A reused component cannot transfer state to another activity ID. Completion callbacks are once per launch; existing daily deduplication is preserved.

The shared metric is now **Support practices / sessions**, not Flow sessions; text/writing and card-use counts do not imply productivity or tic reduction. Existing Voice or Type Freely and Writing Pad are unchanged. No new database fields, migrations, camera, microphone, speech, AI, external messages, clinical decision or symptom collection.

## Automated and manual gates

Draft-cache tests cover valid/invalid scopes, malformed/sparse/unbounded data, defensive copies, stripping extra fields, erasure, guest transitions and invalidation without a mounted component. Component tests cover creative choices/undo, same-tab resume, fresh review/time, immediate optional passes, pause/hidden time, keyboard/focus, guests and stale/batched sessions. Real dashboard tests cover actual card/modal/progress handoff, reuse with unchanged daily records and no generic Mark Complete bypass. Catalogue tests retain planned-tool exclusion, check all twelve zones have daily pathways and detect remaining planned entries/duplicate IDs. Exact executed counts are recorded on #18 only after CI.

Before release: actual phone/tablet/desktop and narrow-screen/zoom review; keyboard and screen-reader focus/announcements; fixed-message usefulness; intended-user and appropriate neuro-inclusive specialist review. Check accidental-repeat/undo usability, closed-modal draft disclosure, sign-out on shared devices, completed-card reuse and the wider product's marketing/claim consistency. A passing test suite does not establish clinical efficacy, security perfection or pilot approval. Existing broader privacy/safeguarding and branch-protection gates remain separate.

## Contextual reference reviewed 11 September 2026

NHS, Tics — Treatment: https://www.nhs.uk/conditions/tics/treatment/

NHS guidance supports reassurance, avoiding punishment for tics, and discussing school accommodations. It is context for the non-punitive design, **not endorsement or evidence of effectiveness for these tools**. This feature is an accommodation/creative aid, not tic treatment, diagnosis or monitoring.

Production, Changers, Worry Diary, Teacher AI PR #16, live data/migrations, secrets/configuration and branch deletion are out of scope. Every commit has an explanatory issue comment. All temporary hash-checked integration preparation workflows are removed; ordinary CI stays read-only and dependencies are unchanged.
