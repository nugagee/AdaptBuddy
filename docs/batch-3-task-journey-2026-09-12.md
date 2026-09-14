# Batch 3A: reliable child task handoff

## Starting point

Source baseline: `573e36fad3b638e84d0ec7bd098f6c999cbdfe2a` on `upload/adaptbuddy-web`, including merged PR #16 (Assignment AI), #22 (release documentation) and #23 (guest role chooser). At the initial check only main existed and no PRs were open. This slice uses one fresh branch, `codex/batch-3-task-journey`. It does not rebuild those features or merge automatically.

## Findings addressed

The teacher-task panel previously applied all asynchronous load/save responses without checking that the original account was still active. A single saving ID did not prevent simultaneous writes to different tasks. Backend-unavailable or guest saves could return successfully without a write. Refresh errors could leave old task contents looking current. The optional mood handler closed before its save finished, called the general completion upsert again, and could replace the completion timestamp. Selecting Done could label pronunciation support as used merely because it was suggested.

## Implemented contract

- The actual child account and ready progress owner must agree before mounting a real task panel. Guests do not load/save real tasks. Separate child IDs use separate component instances.
- Request revisions and synchronous auth/progress invalidation reject old callbacks, including invalid-to-ready transitions in a single React batch. Unmount prevents late navigation or celebration. Normal same-account refresh with intact readiness keeps the task state.
- One pending read/write at a time. Refresh clears the previous list and explicitly distinguishes loading, successful empty, unavailable and changed-session states.
- Save success requires a returned row matching the child, task and requested status. Missing backend, guest/invalid input, errors or mismatched/empty receipts cannot silently resolve as saved. An uncertain status write requires refresh before retry, because a lost response may follow an accepted database write.
- Done remains a child-reported update, not evidence that the actual task was done or a teacher assessed it. Suggested support labels do not prove tool use. No inferred pronunciation support, repeated Done writes, extra stars or clinical scores.
- Pronunciation navigation follows only a confirmed in-progress save in the original active session. Non-pronunciation Start still records in-progress only; additional tool handoffs remain later work.
- Help means a saved task record, not an email/push notification or evidence a teacher has seen it. Nearby-adult guidance remains explicit for immediate help.
- Sharing a task feeling is optional, explicitly explains adult visibility and supports Skip. It uses a narrow update of mood_after_task on an existing completed/submitted row. It does not overwrite status, supports or submitted_at, create a row or repeat the completion celebration. Failure retains retry/skip; no raw backend details are shown to children.

## Validation boundaries

New component tests use the real auth and child-progress stores with synthetic identities, mocked assignment services, deferred promises and actual rendered controls. Service tests use synthetic Supabase query chains to verify filters, error propagation and returned-row checks. These are not tests of deployed row-level security, physical devices or a complete teacher-to-parent database journey. Full project CI and preview results must be recorded on Issue #18/PR after execution; test source alone is not passing evidence.

Existing task schema and RLS are unchanged and remain the server authority. The historical missing-archived-column read fallback is retained for compatibility; this slice does not certify archive filtering on a legacy schema. An already-sent network write cannot be recalled by UI cleanup. Server policies still determine whether that write is permitted; no claim is made that every interrupted request was unsaved.

Reference contracts consulted: React useEffect cleanup/race handling (`https://react.dev/reference/react/useEffect`) and Supabase update/select returned-row semantics (`https://supabase.com/docs/reference/javascript/update`, `https://supabase.com/docs/reference/javascript/using-modifiers-select`).

## Next Batch 3 gates (not completed here)

1. Review the actual school/parent authority contract and newer release evidence, not only historical SQL. Support-only contacts must not acquire broader school access merely through a support invitation.
2. Rehearse teacher publish -> approved active child -> task activity -> status/help update -> matching authorised adult summary with disposable synthetic accounts/database. Add pending/revoked/unrelated-account and archived-task cases against real SQL policies.
3. Separate parent-summary unavailable states from empty results, verify adult views and optional-sharing copy, and complete other tool handoffs without exposing journal text or temporary recordings.
4. Phone/tablet/keyboard/screen-reader/full-app acceptance and an explicitly labelled repeatable demonstration before release.

## Untouched

No production branch mutation, database/schema migration, real child data, environment/secrets change, paid model request, actual assignment publication, Changers work, Worry Diary release, audio/scoring changes or branch deletion. PR #16 remains merged; its production runtime enablement is not assumed. Every commit must have a clear message plus an individual explanatory GitHub comment. New code stays draft/unmerged until review.
