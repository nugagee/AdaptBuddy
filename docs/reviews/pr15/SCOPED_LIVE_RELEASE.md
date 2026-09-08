# Scoped live release — 8 September 2026

The owner requested deployment now, deferring the remaining safeguarding operations. PR #15 is already integrated. This release preserves the learning improvements and private journal/mood saves, while keeping new trusted-adult requests and atomic support recording disabled in the application. This does not certify the existing database authority or school-access rules as complete.

## Release boundary

- Checked-in `TRUSTED_ADULT_INVITATIONS_ENABLED` and `SUPPORT_RECORDING_ENABLED` are false. Shared service entry points reject before backend access; Settings and Buddy/mood panels omit the unfinished recording actions.
- Buddy safety responses direct children to a safe adult nearby and say AdaptBuddy cannot contact an adult for them.
- Learning check-ins save private journal entries, including derived analysis. They do not create alerts or adult signals; local-only saves do not promise eventual sync or adult delivery.
- `supabase/release-scripts/20260908_scoped_live_release.sql` combines only mood privacy 040 and profile compatibility 043 in one repeatable transaction with bounded locks. It adds `profiles.sex`, accepts current and historical gender values without rewriting them, and makes mood notes private by default.
- Drafts 041/042, administrator changes, relationship quarantine, invitation acceptance and support delivery are excluded. The current backend's pre-existing authority and school-access gaps remain follow-up work; a frontend release flag does not remediate them.

## Verification

- Real local Supabase rehearsal using the exact hosted public schema and only this release transaction: **12 checks passed**. Includes email confirmation captured locally, password login, session refresh, current profile options, complete signup/settings payloads, private journal/derived analysis/mood isolation from linked and unrelated adults, no shared derivatives, and repeat application preserving rows.
- Auth/privacy runtime checks: **17 passed**, including disabled actions reaching no backend at all and private mood/journal writes.
- Existing SQL fixture checks: **21 profile + 31 trusted-adult checks passed**. Those exercise future drafts; they are not evidence that those drafts are live.
- Full application regression check: **18 suites / 69 tests passed**, including the two support surfaces, hidden Settings invitation form, ADHD and Dyslexia learning. Production build passed.
- A fresh schema-only production backup matched the rehearsed baseline byte for byte (SHA-256 `c0ca015ae4660ff9ddc7f3b361f802319639720a615d91d73671a8e724549ccb`). It contains no user records and is kept outside Git. Local synthetic full-backup recovery was separately verified in `ACCESS_LIFECYCLE_AND_RECOVERY.md`.

Independent candidate review found one false empty-state message when connection lookup was disabled. The message is now gated on an enabled lookup, with an existing-contact regression case. No remaining recording route was found in the inspected callers.

## Deployment record

The exact scoped SQL transaction was applied to `fmlxtlicawkgiemubyid` on 8 September 2026. Readback confirmed both new columns, current profile constraints, the private mood default and stricter adult-read policy; the child policy and existing row counts were preserved. Both deferred RPCs remain absent. Vercel preview `8qaxqUdHEoewXbgDYDBjTi93EsCY` passed for source candidate `f50c043`. The production Git hold is removed by this release change. Final live verification is recorded separately after deployment. Supabase remains Free and Vercel remains Hobby.

## Recovery and remaining work

If a web regression appears, use the prior Vercel production deployment while retaining the additive database columns and stricter mood policy. Do not reverse privacy protections or replay broad SQL drafts as a rollback. A failed release SQL statement rolls back the whole transaction.

The R1–R8 checklist remains authoritative for the unfinished invitation, authority, school access, recovery and safeguarding operations. This release excludes unfinished capabilities; it does not mark those items complete. No live signup emails or billable AI requests are needed for deployment smoke checks.
