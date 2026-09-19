# Batch 3 — school-task SQL authority rehearsal

## Scope and status

Continue existing draft PR #24 from 2f1956d, not a new branch or main merge. Child and parent UI work is retained. This slice adds a **draft database candidate** and a real PostgreSQL/RLS rehearsal. It does not deploy database changes, complete the teacher reporting UI, verify real guardian identity, or approve a school pilot.

Files: `supabase/migration-drafts/045_school_task_access_boundary.draft.sql` and `scripts/test-school-task-authority.cjs`. The SQL remains outside the automatic migrations directory. CI executes it only against a fresh in-memory PGlite database, using the existing locked development dependency. No connection URL is accepted, no production credentials are passed, and there is no hosted Auth, mail, paid AI or live data access.

## Source findings to reproduce

The historical 019 submission policy checks child identity without checking membership in the assignment's class. The 023 security-definer parent summary recognises a legacy relationship/connected contact without verified guardian/class evidence. Historical task reads do not themselves exclude archived work or check current account status. These are source-level findings to reproduce in a synthetic schema; current deployed definitions may differ and must be read back separately before claiming a live exposure.

The rehearsal reports legacy findings separately as **reproduced (not safe)**, not passing current security requirements. Its candidate section must show both allowed use and denied misuse. A green candidate test does not certify unchanged legacy permissions.

## Proposed task-specific contract

- Require a current synthetic/real Auth session, canonical active/authorised confirmed profile, correct role and non-banned/non-deleted account.
- Teachers manage their own current classes/tasks only; children read/save only with matching active membership and recorded teacher/parent approval.
- Existing guardian acceptance and separately privileged verification evidence must match a current approving parent. Verification must identify a currently verified administrator; an accepted support-only contact is never sufficient.
- Matching class ownership and approval/visibility evidence, including academicTasks=true, are checked at read/write time.
- Eight restrictive policies intersect with historical task/submission policies; permissive OR rules alone would not close the old write path. An owner-scoped class-policy helper avoids profile/class policy recursion without permitting broader browser access.
- Parent summaries check authority inside the security-definer function and retain the existing response fields. No fallback to raw task/submission tables, private response text, voice recordings or diary content.
- Read-only teacher/parent result views cannot rewrite child results. Task/submission identity cannot be moved to another owner/class/task by an authenticated update.
- Archive, unlink, revoked membership, withdrawn approval/evidence, profile/Auth changes and revoked sessions are negative cases. Existing rows are preserved, not purged by 045.
- Private helpers are not executable by browser roles. Only scoped policy entrypoints and the existing bounded summary contract are exposed.

## Critical dependency and deployment warning

**045 depends on the broad 041 guardian/class guardrail draft, not merely the narrow 041/044 scoped support release.** It refuses a schema without guardian evidence and the class-approval trigger. The older broad 041 draft contains quarantine/invalidation updates and must not be applied blindly to live links. A rehearsal on empty synthetic tables is not evidence that those updates are suitable for existing users.

Guardian verification provenance, multiple guardians, administrative roles, historical archive access, performance, service ownership, live row inventory, backup/recovery and staged rollout require review. This proposed narrow parent contract shows tasks to the currently approving verified guardian, not automatically every adult who knows the child. Other school/session/report RPCs require a separate audit; this file does not claim to secure all such endpoints.

## Rehearsal mechanics and evidence limits

The runner loads existing synthetic Auth/support fixtures and actual tracked 019/020/021/023/032 school migrations. It omits only the pgcrypto installation statement because gen_random_uuid is core in this embedded PostgreSQL; unrelated fixture tables remain synthetic. Two databases distinguish the narrow 041/044 baseline from the broad 041 plus task-specific candidate. Source SHA-256 hashes and results are written to a CI artifact.

The allowed journey executes real SQL as authenticated teacher/child/parent roles: publish a synthetic task, read it as the approved child, upsert status, then read matching teacher and parent results. It also tests the optional feeling update without rewriting completion metadata. Fixture administrator/guardian approval is seeded by the trusted test harness; the actual browser approval UI and hosted Auth/PostgREST are not exercised. PGlite has one connection: multi-session concurrency/races remain untested here.

Run: `node scripts/test-school-task-authority.cjs` after locked dependency installation. The normal CI adds this named candidate step before build and preserves its JSON report even on failure. Exact executed totals and any corrections belong in PR #24 / Issue #18 comments after execution; no unexecuted test source is labelled passing.

## Remaining gates

1. Read-only live metadata/function/policy comparison through an authorised Supabase connection, without retrieving child records. A connector was suggested, not assumed connected.
2. Rehearse a schema-only restore using disposable local Supabase Auth/PostgREST, actual client service operations, simultaneous sessions and revocation ordering.
3. Independently review and agree the guardian/school authority model and resolve other security-definer school RPCs; prepare a narrowly reviewed rollout rather than applying broad drafts.
4. Complete teacher-side reporting and other activity-type handoffs, whole-app device/accessibility acceptance and owner release approval.

Existing scores, audio, Worry Diary, Changers, live schema/records, provider settings and main remain unchanged. Every commit has an explanatory GitHub comment. The temporary source-export workflow is removed by the candidate commit.

Technical references: https://www.postgresql.org/docs/17/ddl-rowsecurity.html (restrictive/permissive composition and owner bypass); https://pglite.dev/docs/about (embedded PostgreSQL and CI use); https://pglite.dev/docs/ (single-connection limitation).
