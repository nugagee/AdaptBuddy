# Batch 3: teacher task reporting and account-safe report reads

## Baseline and scope

Continues `codex/batch-3-task-journey` / draft PR #24 from `cdff765`. Main remains separate. The preceding child/parent changes and synthetic candidate SQL rehearsal are retained. No candidate SQL is applied to a live database by this slice.

## Actual route improvements

`Reports.tsx` now mounts the entire report by a teacher/admin session generation (or an explicitly labelled teacher demo). Changed role/status/authorisation/identity clears the old report and selections, including a transient invalid-and-restored scope within one React batch. Benign same-account profile edits do not cause a reset. One active request, a 20-second timeout, clear-on-refresh, redacted failure/retry and late-response rejection prevent stale records from being treated as current. Pending printing is invalidated by account change, refresh, selection change or unmount. Failed reads never become an empty report or an enabled stale export.

The strict Reports source is opt-in through `getDashboardSummary({reportOwnerId})`; other teacher-dashboard callers retain their existing separate contract. It requires a matching confirmed backend user, a canonical active/authorised teacher/admin profile, owned classes and teacher-scoped active memberships. Task/submission reads use explicit fields and scope filters. Counts must equal the complete returned rows within bounded limits (100 classes, 1,000 memberships, 500 assignments, 1,000 submissions); unavailable counts, truncation, null/error data, duplicates, malformed statuses/dates and out-of-scope rows fail rather than invent complete evidence. Large snapshots are unavailable, not automatically paginated; a narrower per-class/paged report is future work. Current class scope may be narrower than an administrator's broader permissions.

The Reports path does not use the historical missing-archive-column fallback. An unavailable lifecycle contract produces unavailable reporting, not an assumption that archived tasks are active. The strict task reader adds no journal, support-contact or voice queries. Existing separate support-planning sections still use their existing reader/visibility contracts and are not newly certified by this task-source validation. A failure in the full report load clears the whole view.

## Meaning of records

A returned submission sets `hasRecordedUpdate`; its absence means **No status returned**, not a proven lack of effort or an explicit not-started update. Existing counters for other views are unchanged; the Reports view computes its figures from learner rows with the source marker. Completion is the proportion of visible learner-task pairs with a recorded completed/submitted status. No denominator produces no percentage. Counts are not mastery, attendance, response time or a verified teacher assessment.

Expandable per-task learner records show recorded status, returned support use, optional shared task feeling (under the existing visibility setting) and the actual returned status timestamp. Suggested tools remain separate; they are never substituted for missing support use. No invented Visual Steps default or inference that the most frequent support was the most useful. Help is a record, not an email/push alert, seen receipt or response guarantee. Task date filters are based on due date (creation date if no due date), not the time an individual practised. A snapshot is not complete school history.

CSV exports use the same evidence rules as the screen. Empty rosters do not create fictional not-started learner rows or invented support use/timestamps. Formula-leading cells are escaped as text. Exported notes distinguish suggestions, statuses and observations; guest exports are labelled fictional. Existing support-plan/print facilities remain, with corrected task labels, recorded-use summaries and generation/context safeguards. Existing pronunciation scores, audio and activity rewards are unchanged.

## What these protections do not establish

Client response validation and lifecycle protection do not replace RLS or certify guardian/class approval. They cannot recall an already sent network request. No support-only contact is granted school authority here. Backend state can change between sequential queries; this is not an atomic database snapshot. The live deployed school/guardian contract review and candidate prerequisites remain open. The candidate's 40 synthetic SQL checks are separate evidence, not proof that these UI queries ran against the live schema. No live accounts, assignments, database records or paid provider calls are needed for the automated tests.

## Tests and acceptance

New tests exercise the strict source and its actual dashboard integration, canonical identity, own-class filters, counts/truncation, invalid/duplicate/out-of-scope responses, hidden academic/mood visibility, explicit guest mode and missing lifecycle metadata. Report-model/CSV tests cover missing versus recorded status, honest support use, snapshot dates and formula-leading input. Actual Reports component tests cover loading/empty/failure, retry, timeout, refresh, account/guest/role changes, transient invalidation, class selection, printing and exports. Test source alone is not passing evidence: exact results and run/artifact IDs belong on #18 and PR #24 after execution.

Still required: actual full-app teacher publish → approved child activity → confirmed progress → authorised parent/teacher review in a disposable backend; remaining activity handoffs; deployed authority review; real devices, keyboard/screen reader, large text and intended-user acceptance. Existing support-planning/other teacher pages need their own broader evidence review. This slice is not pilot approval or clinical validation.

Technical references consulted: React effect cleanup/race guidance (`https://react.dev/reference/react/useEffect`) and Supabase explicit-column/count/range contracts (`https://supabase.com/docs/reference/javascript/select`, `https://supabase.com/docs/reference/javascript/using-modifiers-range`).

Every GitHub commit has a message plus an individual explanatory comment. No main merge, branch deletion, Changers work, Worry Diary release, permanent audio, schema/migration, candidate-SQL logic, dependencies, secrets or deployment settings are changed. Temporary preparation workflows are removed in the feature tree; existing read-only CI and synthetic SQL rehearsal are preserved.
