> **Source integration authorised, production release held (8 September 2026).** The owner authorised merging PR #15 while automatic deployment for `upload/adaptbuddy-web` is disabled in `vercel.json`. This supersedes the earlier keep-draft/no-merge instruction below. It does not authorise releasing unfinished safeguarding features or applying the broad database draft. The current remaining work is tracked in [the completion checklist](reviews/pr15/COMPLETION_CHECKLIST.md).

# Worry Diary Safeguarding — Phase 1 Review Checkpoint

**Status:** Pre-pilot, not deployable. This isolated draft consolidates selected application guardrails and an unapplied database proposal for review. It is not an emergency service and does not provide guaranteed adult notification.

## Safety invariant

AdaptBuddy may record an in-app support signal for human review. It does not diagnose, decide that a child is safe, or replace human safeguarding judgement. The interface must never claim that an adult was contacted unless an eligible real recipient exists and the relevant delivery step succeeded.

## September repair evidence

See [the repairs and validation record](reviews/pr15/FIXES_AND_VALIDATION.md). The combined application passes 66 tests; 15 runtime checks and 52 PostgreSQL checks cover the repaired boundaries. SQL is still unapplied to hosted Supabase. The inventory below distinguishes those repairs from the remaining operational work.

## Preliminary inventory

This inventory is intentionally unscored. Percent-complete estimates would be misleading until the full pathway has acceptance criteria and independent safeguarding and security review.

| Capability | Current evidence | Release gap |
| --- | --- | --- |
| Child journal with typing and speech-to-text | Application UI and browser save path exist | Accessibility and end-to-end tests remain |
| Journal, signal, and alert storage | Private entries use one write; explicit support requests use a versioned transactional RPC with tested idempotency | Hosted SQL, eligible recipient routing and delivery are not deployed |
| Context-aware safeguarding analysis | A weak client-side detector exists | Canonical server-side analysis, calibrated evaluation, and human review are missing |
| Private-by-default handling | Some reads filter shared entries | Privacy is unproven; signal creation and historical RLS/defaults require a complete audit and cross-account tests |
| Immediate child safety response | General Buddy safety copy exists | Age-appropriate urgent guidance is not integrated into the Worry Diary pathway |
| Accepted trusted adult | Versioned pending-only requests and SQL acceptance/revocation tests exist | Invitation delivery and accept/decline UI are missing; SQL is unapplied to Supabase |
| Parent-approved teacher access | Draft SQL records separate approvals | Historical class, session, assignment, and RLS paths still require audit and tests |
| Adult response workflow | Alert acknowledgement exists | Ownership, action, escalation, response timing, and closure evidence are missing |
| Email, SMS, push, retries, and backup escalation | Not implemented | Required before any notification claim |
| Full child-to-adult safeguarding test | Not implemented | Separate-account end-to-end tests are required |

## Implemented in application source

- Removed fictional default trusted adults and browser-wide persistence of their contact details.
- Scoped the trusted-adult store to the current child and clear it across account, role, guest, and authentication transitions.
- Prevented pending adults from being selected or described as connected.
- Added an explicit zero-connected-recipient state and changed support copy from “sent” to “recorded; delivery not confirmed.”
- Disabled operational trusted-adult invitations in guest mode and fail closed when Supabase is not configured.
- Require acceptance evidence when mapping a trusted adult as connected in child and parent views.
- Disabled generic Buddy ID self-linking as an authorisation path.
- Removed the guest-admin path and require Supabase's local authenticated session to be cleared before entering guest mode.
- Removed the committed bootstrap password. The admin seed now requires environment-provided credentials, does not print the password, and does not reset an existing account's password or sessions.
- Made class visibility defaults private and removed the legacy class-request audit fallback.
- Added dependency-free static source-pattern checks to the production prebuild alongside the existing Buddy safety test.

The combined source passes its build, existing tests and additional runtime/PostgreSQL checks. Preview review and hosted multi-account integration tests remain. See the validation record for exact test scope and limits.

## Proposed in draft SQL — do not apply

`supabase/migration-drafts/041_safeguarding_access_guardrails.draft.sql` is an unapplied design proposal. It is stored outside the automatic migration sequence because it is not approved for staging or production.

The proposal explores:

- explicit trusted-adult acceptance evidence and account-email acceptance;
- quarantine of legacy links and unverified administrator state;
- tighter profile authority-field protection and signup-role sanitisation;
- parent and teacher approval evidence for class membership;
- revocation and relationship-cleanup triggers; and
- removal of direct browser writes to selected authorisation tables.

It is **not** a complete database security boundary. Historical teacher/class policies, live sessions, assignments/submissions, derived-access revocation, teacher verification, and the broader RLS/RPC surface still require independent review. Applying it now could interrupt legitimate access without proving that every old access path is closed.

## Known release blockers

1. Transactional in-app support recording is implemented and tested locally; canonical assessment, recipient routing and hosted integration remain incomplete.
2. The selected adult is a settings preference only; no verified recipient routing or external delivery exists.
3. There is no trusted-adult invitation inbox or accept/decline UI.
4. Journal guidance now explains direct adult contact and immediate danger. The complete age-appropriate disclosure and escalation journey still needs review.
5. Historical class/teacher RLS and RPCs and the teacher-verification lifecycle are incomplete.
6. Synthetic PostgreSQL actor tests exist; full hosted cross-account and concurrency tests remain.
7. Delivery receipts, retries, timeout monitoring, backup-adult escalation, and response/closure workflow are missing.
8. Retention rules, DPIA, response ownership, service targets, and the safeguarding incident procedure are incomplete.
9. The historically committed administrator password must be rotated in the live identity provider and existing sessions revoked.
10. The database proposal needs backup planning, independent review, staged rehearsal, quarantine review, and rollback rehearsal.

Until these are complete, product copy must describe records as **in-app support signals**, never as guaranteed emergency notifications.

## Required work before deployment

1. Keep the pull request in draft and do not merge, deploy, or apply the SQL proposal.
2. Rotate the exposed administrator credential, revoke existing sessions, review recent activity, and enable and enforce MFA for privileged accounts.
3. Complete independent application-security, database/RLS, and safeguarding reviews.
4. Implement one authenticated server-side Worry Diary transaction and explicit recipient-routing rules.
5. Implement acceptance UI, delivery, receipts, retries, escalation, urgent child guidance, and an adult action/closure workflow.
6. Run the application build and preview checks, then execute the full multi-account test matrix.
7. Take a recoverable staging backup and inventory affected identities and relationships before promoting any reviewed SQL into a new migration.
8. Rehearse migration, quarantine review, re-acceptance/re-approval, and rollback in staging.
9. Complete the DPIA, retention policy, response ownership, service targets, and incident operating procedure.

## Contingency requirement

A safe degraded/read-only mode that preserves disclosures and directs the child to a nearby safe adult is required but not yet implemented. Do not treat it as an available rollback control.

## Review gate

This phase is a review checkpoint, not a release candidate. Opening its draft pull request changes neither production nor Supabase; live systems change only after an explicit future merge, deployment, and separately approved database operation.
