# Batch 3 — parent task visibility and session reliability

## Scope

Follow-up on the existing `codex/batch-3-task-journey` branch / draft PR #24. Main at discovery was `573e36f`; preceding child-task checkpoint was `f720557` (89 suites / 841 tests). No new duplicate branch or production merge is part of this slice. PRs #22 (historical records) and #23 (guest chooser) are already in the newer baseline.

## Source findings and changes

The historical parent task reader converted a missing `parent_assignment_summaries` RPC to an empty array. The overview and review could therefore say no tasks and show zero task-help counts without a successful read. The review also combined `support_tools` (suggestions) with `support_used` (recorded use). Parent loading was keyed by guest mode rather than the authenticated identity.

This slice adds an explicit available/unavailable marker for school tasks. Missing configuration, failed/null/malformed/duplicated/out-of-scope results never become a verified empty list. A failure is contained to the task section where the rest of the dashboard loaded successfully; full-dashboard failure has a redacted retry state, not a false no-linked-child screen. The reader uses only the existing RPC and has no fallback to raw assignment/submission tables. Counts describe returned records, not a complete history.

The real Parent Hub uses a session generation keyed to guest/user/profile identity, role, status and authorisation. A changed or briefly invalid then restored identity remounts all account-scoped page state and rejects earlier reads. Same-account benign profile updates do not reset the view. Loading has one active request, a 20-second timeout, clear-on-refresh, redacted errors and retry. Late responses after timeout, unmount or account changes cannot reappear. This client lifecycle protection does not replace SQL authority or recall an already-sent operation.

The overview separates suggested tools and recorded support use, labels completed/submitted as recorded statuses rather than teacher assessment or skill mastery, and explains that a help record is not proof of a teacher receipt/response. The review counts only `support_used` and labels unknown task totals/help evidence as unavailable/incomplete. Optional task feeling remains a shared task-record field, not private diary content. Existing pronunciation percentages, media, activities and rewards are untouched. Demo fixtures remain fictional and trigger no live read.

## Tests and evidence

New synthetic suites cover service response validation, unavailable versus empty handling, status/reporting language, actual Parent Hub loading/refresh/retry, stale/overlapping requests, timeouts, guest transitions, account/role/status/authorisation changes and brief batched interruptions. Existing child-side tests are retained. Exact executed counts/run IDs are recorded on #18 and #24 after full CI. Source review/syntax transpilation is not full project execution. Mocked RPC results are not a real-database end-to-end or RLS test.

## Authority review remains a separate release gate

Read source definitions in migrations 022 and 023. The later 023 parent summary excludes archived assignments and requires active membership, but still recognises legacy child_relationships or legacy trusted_adults. A support-only invitation in the newer scoped support tables must not be conflated with general school/guardian authority. This slice neither changes nor certifies those historical permissions or the deployed function definitions. Do not expand sharing based on a passing UI test.

Before broader release, rehearse a disposable synthetic database journey using current deployed-contract evidence: teacher publishes, approved child receives/practises/saves, authorised parent/teacher sees matching status. Include unrelated, pending, revoked, support-only and archived-task negatives. Review which role/membership changes must invalidate access server-side. Preserve Worry Diary privacy and never include temporary audio clips in school summaries.

## Remaining manual acceptance

Phone/tablet/desktop refresh and retry, child selection, guest chooser, account switch/sign-out, keyboard focus, screen readers, zoom and long task text; owner/intended-user review. Further activity handoffs, teacher view and the complete database journey remain open. No clinical/pilot sign-off is claimed.

Every commit has an explanatory comment on #18. Temporary source/integration workflows are removed in the implementation commit; ordinary CI and dependencies are unchanged. No main merge, branch deletion, Changers, Worry Diary release, provider calls, live records/schema/migrations, saved audio or secrets/deployment changes occurred.
