# Access lifecycle fix and recovery rehearsal — 8 September 2026

## Outcome: fixed within the tested boundary

PR #15 was merged as `a40cf2c2f61abc919af65f953cc28dd459d85c44` with automatic deployment for `upload/adaptbuddy-web` held. The local main checkout was fast-forwarded to it. Vercel continued serving production deployment `HZEkgJ12aXXrXnCsR3i3rUT4niEn` from `7dc5e73a43a9b8799c615648cbd456a59b087e11`; the live homepage HTML and JS/CSS asset identifiers were identical before and after the merge.

This follow-up fixes the acceptance/invalidation boundary in the still-unreleased SQL draft. It is not a claim that the full safeguarding pathway or the hosted database is ready.

## Original boundary and legitimate behavior

An authenticated parent could begin accepting a pending invitation, cache an active account and confirmed email, then wait for the invitation row while a concurrent suspension or Auth identity change committed. The acceptance could subsequently create connected contact and relationship records from the stale decision. Child suspension and removal of confirmed-email evidence also failed to invalidate some existing contacts.

The invariant is that changes removing account or identity authority must prevent new contact access or remove an acceptance that completed first. A confirmed active parent must still be able to accept a child-created pending invitation once, without that acceptance itself supplying guardian-verification evidence.

## Selected fix

The acceptance function now acquires conflicting row locks in the same order used by identity synchronization: Auth identity, deterministically ordered parent/child profiles, then the invitation. It validates the child is active and rechecks the invitation's child after locking it. The profile invalidation trigger now covers child-side links and changes to email confirmation evidence. Existing demotion/removal triggers clear acceptance evidence and derived relationships.

Changes are confined to this shared acceptance/lifecycle boundary. Public function signatures and legitimate confirmed-parent acceptance remain unchanged. Existing direct-write revocations and disabled legacy automatic-link routes remain intact. No production SQL was applied.

Files changed: `supabase/migration-drafts/041_safeguarding_access_guardrails.draft.sql`, new `scripts/test-trusted-adult-concurrency.cjs`, and a schema-cache readiness wait in `scripts/test-supabase-local.cjs`.

## Ordered validation

1. Syntax/diff checks: `node --check scripts/test-trusted-adult-concurrency.cjs`, `node --check scripts/test-supabase-local.cjs`, and `git diff --check` pass.
2. Original trigger and alternatives: the local multi-session harness initially passed its legitimate control and failed seven security cases. It now passes all eight, including parent suspension, canonical email changes, removal of email confirmation, child suspension, and existing-contact invalidation. Tests observe PostgreSQL lock waits to orchestrate the race instead of assuming a timer has established the schedule. Existing authenticated actor claims cannot read the shared mood after invalidation.
3. Legitimate and regression controls: all 21 local Auth/PostgREST/PostgreSQL integration checks pass on a fresh restore with the full draft applied. The 21 profile-authority and 31 trusted-adult PostgreSQL fixture checks pass, including normal acceptance, private/shared reads, guardian-evidence withdrawal, child revocation, legacy adult unlink and full draft rerun. An independent read-only reviewer found no concrete surviving bypass/regression in the supplied candidate and separately ran the 31 trusted-adult fixture checks.

Reproduction and verification commands (local stack only):

```sh
export DOCKER_HOST="unix://$HOME/.colima/adaptbuddy-rehearsal/docker.sock"
export ADAPT_BUDDY_LOCAL_REHEARSAL=/private/tmp/adaptbuddy-local-rehearsal
node scripts/test-supabase-local.cjs
node scripts/test-trusted-adult-concurrency.cjs
npm run test:safeguarding
```

A fresh database restore briefly invalidates PostgREST's schema cache. The integration harness now waits for an actual empty profile query to succeed before creating test accounts; it fails on unexpected API errors or timeout. The first immediate-after-restore run exposed this harness timing issue, not a successful acceptance of a failing application test.

## Synthetic backup recovery

A complete custom-format backup of the local synthetic database was restored into a separate `adaptbuddy_recovery_check` database. All 53 public/Auth tables matched row counts and row fingerprints; function definitions, policies, RLS settings and ownership also matched. Backup SHA-256: `a0f46df70eeae3993bc2a1aecb530bc49e05dc133edcc15f6fafa0e9fea22171`.

The first restore attempt using local `postgres` failed because that role could not set managed schema ownership to `supabase_admin`. The successful fresh restore used the local `supabase_admin` role and preserved ownership. This establishes local synthetic recoverability, not hosted restore privileges or a production backup. A hosted recovery method must still be rehearsed with the privileges actually available there.

## Remaining uncertainty

The race tests cover the recorded acceptance-waits-first schedule and sequential invalidation controls, not every possible database interleaving or every historical school/session/report RPC. The broad draft remains a quarantine proposal: downstream guardian authorization and class approval concurrency still need review. Production backup and administrator verification/credential-session rotation are not complete. Invitation delivery, operational response ownership/hours, full adult-response workflow and privacy decisions remain on the completion checklist. The production deployment hold remains enabled.
