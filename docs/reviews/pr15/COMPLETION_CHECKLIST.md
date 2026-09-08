# PR #15 — what is complete and what remains

**Previous scoped production release (8 September):** the owner has now requested a live update while deferring the remaining safeguarding work. [SCOPED_LIVE_RELEASE.md](SCOPED_LIVE_RELEASE.md) defines the reduced scope: private learning/journal/mood and profile compatibility, with new adult requests and support recording disabled. The two scoped database updates are now applied and verified; the production Git hold is removed in the scoped release change. R1–R7 remain open wherever their full acceptance criteria are unmet.

**Current enablement request:** the owner now requests adult invitations and support recording. The isolated candidate and its authority repair are implemented and verified locally; see [SCOPED_SUPPORT_ENABLEMENT.md](SCOPED_SUPPORT_ENABLEMENT.md). No hosted SQL or production deployment for that candidate has occurred. The owner has confirmed the existing administrator account and said its exposed password is unchanged. Release now awaits password rotation; administrator identity no longer needs confirmation. Historical school/guardian authority and safeguarding operations are not marked complete.

Integration checkpoint before this scoped release: PR #15 was merged at `a40cf2c2f61abc919af65f953cc28dd459d85c44`; the local main checkout is updated. Automatic production deployment is held, and the live release was verified unchanged. This checklist does not claim that the new safeguarding workflow is live or ready for a pilot. Supabase Free remains the chosen plan.

## Work already combined and verified

- [x] Preserve the seven local ADHD/Dyslexia commits in the PR repair branch.
- [x] Repair authentication transitions and editable profile saves.
- [x] Preserve private journal entries without copying their contents into adult signals.
- [x] Add pending-only trusted-adult and atomic in-app support contracts as draft SQL.
- [x] Pass 17 application suites / 66 tests, 15 application-module checks and 52 PostgreSQL fixture checks.
- [x] Pass 21 real local Supabase Auth/PostgREST/PostgreSQL checks using a schema-only restore and synthetic accounts.
- [x] Prepare the missing profile-field compatibility correction.
- [x] Verify successful Vercel checks on held-merge commit `48cd3868770bc6b6b7bed792c8ac69003dfeeebc`.
- [x] Merge PR #15 with the deployment hold and verify the existing live release is unchanged.
- [x] Fix the reproduced invitation/account-change race; all eight new local lifecycle checks pass.
- [x] Restore a synthetic backup into a separate local database and verify 53 table fingerprints, policies and ownership.

## Historical decision: combine source before live release

PR #15 targets `upload/adaptbuddy-web`, which is used for Vercel production deployments. A normal merge could therefore release source before its database contracts exist. The owner chose to hold automatic deployment for that exact branch in `vercel.json`, merge the reviewed source, and retain this checklist in the repository. This approval supersedes the earlier instruction to keep the PR draft; the live-release restrictions remain in force.

The original hold was recorded in the root `vercel.json` and was removed for the later scoped release. It preserves the existing rewrite and adds `git.deploymentEnabled["upload/adaptbuddy-web"] = false`. Other branches keep their default preview behavior. This is a Git-triggered deployment hold, not a security barrier against manual deployment, promotion, CLI deployment or deploy hooks; those must also wait until release readiness. It adds no paid service.

Reference: https://vercel.com/docs/project-configuration/git-configuration

## Remaining work before releasing this source

| ID | Work | Complete when |
| --- | --- | --- |
| R1 | Reconcile and release database contracts | Reviewed profile, mood privacy, pending invitation and atomic support changes are applied in a tested order; ordinary profile saves and both new request calls succeed on the intended environment. Scoped mood/profile fields are now live. The new 041/044 authority/support contracts are prepared locally and still require hosted application. |
| R2 | Establish administrator authority | The legitimate administrator is verified; the historical credential is rotated and old sessions are revoked. Evidence is recorded without storing credentials in the repository or chat. |
| R3 | Complete adult and school access rules | Accepted email contact and guardian authority have explicit, separate permissions. Historical classroom, session, assignment and report paths respect them. |
| R4 | Verify concurrency and revocation | Separate sessions prove that suspension, email changes, guardian withdrawal, classroom ownership changes and concurrent acceptance cannot recreate revoked access. Eight acceptance/account-lifecycle checks now pass, in addition to basic sequential revocation and eight simultaneous support retries. Historical class-approval concurrency remains open; see ACCESS_LIFECYCLE_AND_RECOVERY.md. |
| R5 | Complete or safely contain the support workflow | Invitation inbox and accept/decline paths are usable. Recipient routing, delivery status, retries, escalation and adult acknowledgement/closure match the claims made to children. Unavailable functions show truthful guidance; no notification is claimed without evidence. |
| R6 | Prepare recovery and verify deployment | Local synthetic backup recovery passes across 53 tables. Production backup, actual hosted restore privileges, affected-link inventory and quarantine/reverification recovery are still required. Do not blindly apply the broad quarantine draft or restore unsafe permissions as rollback. |
| R7 | Confirm safeguarding operations | Named response owner, response expectations, retention, privacy/DPIA decisions and incident handling are documented and accepted by the responsible owner. |
| R8 | Release deliberately | R1–R7 have evidence or an explicitly reviewed release scope that safely excludes unfinished features. Remove the deployment hold in the release change, verify the resulting deployment and check the actual live login, profile, privacy and support paths. |

Merging the source closes the integration task; it does not check off R1–R8. Mark each row complete only when its acceptance evidence is linked. Keep this file and the detailed validation records together.

## Immediate execution order

1. Completed: PR #15 merged with production deployment held; the live deployment and assets stayed unchanged.
2. Complete the remaining database access/concurrency review locally on Free.
3. Prepare a concrete backup, administrator verification and migration/recovery sequence.
4. Resolve the operational decisions and complete the supported child-to-adult workflow.
5. Verify and release the integrated code and database contracts together.

Detailed follow-up evidence: [ACCESS_LIFECYCLE_AND_RECOVERY.md](ACCESS_LIFECYCLE_AND_RECOVERY.md).
