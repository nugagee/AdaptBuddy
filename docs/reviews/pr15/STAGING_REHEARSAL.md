# Supabase rehearsal decision — Free retained

> Final decision record from 8 September 2026. The owner chose to retain Supabase Free. No Pro upgrade, payment or hosted preview database was created.

## Hosted preview result

The confirmed parent project was AdaptBuddy project `fmlxtlicawkgiemubyid`. Creating a temporary Supabase preview branch was attempted after approval for the quoted Micro compute usage, but Supabase returned HTTP 402 `entitlement_required` because branching required a paid plan.

The attempt registered the existing production project as the default `main` entry in branch metadata. It did not create `codex/pr15-rehearsal`. The default registration was retained because deleting it would target the production project relationship rather than a disposable preview branch.

The owner subsequently chose to retain Free. The temporary Pro-upgrade path was stopped before any subscription or payment change. No existing project was paused, repurposed or replaced.

## Local rehearsal used instead

A separate local Supabase stack used synthetic identities and a schema-only copy of the production public schema. The portable local integration run passed all 21 checks. It covered signup and local email confirmation, profile authority, cross-account isolation, private journal and mood data, trusted-adult invitation acceptance, concurrent support retries, transaction rollback and revocation.

The reusable procedure and evidence are recorded in [LOCAL_SUPABASE_REHEARSAL.md](LOCAL_SUPABASE_REHEARSAL.md). Local credentials, private schema material and synthetic volumes remain outside Git.

The later scoped releases applied the reviewed 040/043 and 041/044 production transactions after backup, comparison and readback checks. See [LIVE_VERIFICATION_2026-09-08.md](LIVE_VERIFICATION_2026-09-08.md) and [LIVE_SUPPORT_VERIFICATION_2026-09-08.md](LIVE_SUPPORT_VERIFICATION_2026-09-08.md).

## Continuing approach

- Continue using disposable local Supabase environments with synthetic data for migration and concurrency rehearsals while the project remains on Free.
- Keep production backups, private credentials and Auth session material outside Git.
- Treat local integration as strong contract evidence, while retaining separate live metadata readback and narrowly scoped production verification.
- Complete the outstanding school-access, delivery, escalation, retention, DPIA and safeguarding-ownership items in [COMPLETION_CHECKLIST.md](COMPLETION_CHECKLIST.md).

Supabase Pro is not required for the current application development and local rehearsal workflow. If hosted preview branches become necessary later, pricing and plan requirements must be checked again at that time.
