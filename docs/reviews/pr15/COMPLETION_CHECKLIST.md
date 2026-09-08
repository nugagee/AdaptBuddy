# PR #15 — what is complete and what remains

Current position: the owner has authorised merging PR #15 with automatic production deployment held. The merge is being prepared; source integration is separate from live release. This checklist does not claim that the new safeguarding workflow is live or ready for a pilot. Supabase Free remains the chosen plan.

## Work already combined and verified

- [x] Preserve the seven local ADHD/Dyslexia commits in the PR repair branch.
- [x] Repair authentication transitions and editable profile saves.
- [x] Preserve private journal entries without copying their contents into adult signals.
- [x] Add pending-only trusted-adult and atomic in-app support contracts as draft SQL.
- [x] Pass 17 application suites / 66 tests, 15 application-module checks and 52 PostgreSQL fixture checks.
- [x] Pass 21 real local Supabase Auth/PostgREST/PostgreSQL checks using a schema-only restore and synthetic accounts.
- [x] Prepare the missing profile-field compatibility correction.
- [x] Verify successful Vercel checks on PR commit c23a00eb44c70d5040ddcfe4d034748b0330cbd4.

## Decision: combine source before live release

PR #15 targets `upload/adaptbuddy-web`, which is used for Vercel production deployments. A normal merge could therefore release source before its database contracts exist. The owner chose to hold automatic deployment for that exact branch in `vercel.json`, merge the reviewed source, and retain this checklist in the repository. This approval supersedes the earlier instruction to keep the PR draft; the live-release restrictions remain in force.

The hold is recorded in the root `vercel.json`. It preserves the existing rewrite and adds `git.deploymentEnabled["upload/adaptbuddy-web"] = false`. Other branches keep their default preview behavior. This is a Git-triggered deployment hold, not a security barrier against manual deployment, promotion, CLI deployment or deploy hooks; those must also wait until release readiness. It adds no paid service.

Reference: https://vercel.com/docs/project-configuration/git-configuration

## Remaining work before releasing this source

| ID | Work | Complete when |
| --- | --- | --- |
| R1 | Reconcile and release database contracts | Reviewed profile, mood privacy, pending invitation and atomic support changes are applied in a tested order; ordinary profile saves and both new request calls succeed on the intended environment. The live readiness check currently reports all five required fields/functions/trigger absent. |
| R2 | Establish administrator authority | The legitimate administrator is verified; the historical credential is rotated and old sessions are revoked. Evidence is recorded without storing credentials in the repository or chat. |
| R3 | Complete adult and school access rules | Accepted email contact and guardian authority have explicit, separate permissions. Historical classroom, session, assignment and report paths respect them. |
| R4 | Verify concurrency and revocation | Separate sessions prove that suspension, email changes, guardian withdrawal, classroom ownership changes and concurrent acceptance cannot recreate revoked access. Basic sequential revocation and eight concurrent support retries already pass locally. |
| R5 | Complete or safely contain the support workflow | Invitation inbox and accept/decline paths are usable. Recipient routing, delivery status, retries, escalation and adult acknowledgement/closure match the claims made to children. Unavailable functions show truthful guidance; no notification is claimed without evidence. |
| R6 | Prepare recovery and verify deployment | Back up recoverable state, inventory affected links without exposing child details, rehearse migration/quarantine recovery, and test the combined candidate. Do not blindly apply the broad quarantine draft or restore unsafe permissions as rollback. |
| R7 | Confirm safeguarding operations | Named response owner, response expectations, retention, privacy/DPIA decisions and incident handling are documented and accepted by the responsible owner. |
| R8 | Release deliberately | R1–R7 have evidence or an explicitly reviewed release scope that safely excludes unfinished features. Remove the deployment hold in the release change, verify the resulting deployment and check the actual live login, profile, privacy and support paths. |

Merging the source closes the integration task; it does not check off R1–R8. Mark each row complete only when its acceptance evidence is linked. Keep this file and the detailed validation records together.

## Immediate execution order

1. Merge PR #15 with the production deployment hold and verify the current live deployment is unchanged.
2. Complete the remaining database access/concurrency review locally on Free.
3. Prepare a concrete backup, administrator verification and migration/recovery sequence.
4. Resolve the operational decisions and complete the supported child-to-adult workflow.
5. Verify and release the integrated code and database contracts together.
