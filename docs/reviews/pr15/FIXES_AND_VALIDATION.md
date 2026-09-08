# PR #15 fixes and validation — 8 September 2026

The repair branch combines PR #15 (`ccb40b2`) with the seven local ADHD/Dyslexia commits ending at `324e597`. The dashboard conflict is resolved with energy pacing, support signals, achievements and Dyslexia progress preserved. The original findings in `REVIEW.md` describe the earlier PR snapshot; this file records the subsequent repairs.

## What changed

- Authentication work carries a transition version. Sign-out, guest entry, newer account changes and initialization cleanup invalidate older work. Stale successful or failed profile loads cannot restore an old account or sign out a newer one. Profile refresh follows the same rule. Signup updates editable profile details only; it preserves onboarding and learning preferences and leaves identity, role and verification to the server.
- Missing trusted-adult schema no longer breaks the entire parent dashboard. Parent and child screens distinguish unavailable connections from a confirmed empty list. Child request controls are disabled when connections cannot be checked. New requests use `record_trusted_adult_request_v1`, explicitly bind the intended child, require a pending-only result and never fall back to the old auto-connect function.
- Private journal saves write only the private entry. They do not copy text or analysis into adult-visible signal/alert tables. The journal explains that it does not contact an adult, gives immediate-danger guidance, and keeps the child's text visible after a failed save.
- Support-request buttons use `record_child_support_request_v1`. Its proposed SQL transaction records the journal entry, signal, alert and idempotency receipt together, derives the acting child on the server and verifies the intended child. Retries reuse a request ID within the interaction. Failure of any insert rolls back every insert. The request remains marked for human review. **No external adult delivery is implemented or claimed.**
- The full access draft now invalidates classroom approval/membership on adult unlink, child revocation, changed contact identity, withdrawn guardian evidence, account suspension and changed classroom ownership. Both the legacy generic Buddy ID route and the legacy add-adult route fail closed in the proposed database contract.
- A separate, smaller profile-authority candidate blocks browser role/identity changes, sanitizes signup metadata, synchronizes email confirmation from Auth and requires privileged verification for administrator access. It does not delete or demote existing profiles. Existing unverified administrator access will stop, so legitimate administrators must be verified through an authorized service-role process before rollout.

## Validation actually completed

- Combined application: **17 Jest suites / 66 tests passed**, including the local ADHD/Dyslexia work.
- Runtime auth/privacy/compatibility: **15 checks passed**, using actual compiled application modules with isolated mocked sessions and synthetic records.
- Profile authority: **21 PostgreSQL checks passed**.
- Trusted-adult, revocation, privacy and atomic support: **31 PostgreSQL checks passed**, including full draft application/rerun, unauthorized actors, explicit email acceptance, separate guardian evidence, classroom approvals, legacy adult unlink, suspension, ownership change, forced insert failure, duplicate retry and mismatched request rejection.
- Existing Buddy safety and trusted-adult source checks passed.
- Production build passed without application lint warnings. Existing Jest runs log React/React Router deprecation notices.

Database tests use pinned `@electric-sql/pglite` with synthetic tables and an Auth/JWT fixture. They execute PostgreSQL roles, RLS, functions, triggers and transactions. They do **not** reproduce all hosted Supabase policies, extensions, concurrent sessions, GoTrue OTP email flows, production data or delivery providers. They are evidence for the repaired boundaries, not a certification of the full application.

After `npm ci`, run:

```sh
npm run test:safeguarding
CI=true npm test -- --watchAll=false --runInBand
npm run build
```

## Subsequent local Supabase integration

A free local GoTrue/PostgREST/PostgreSQL rehearsal now passes **21 checks** against a schema-only restore of all 26 public tables and 92 live policies. It found and addressed a missing editable profile field in a separate compatibility draft. See [LOCAL_SUPABASE_REHEARSAL.md](LOCAL_SUPABASE_REHEARSAL.md) for the scope, initial failure, rerun and remaining concurrency gaps. No hosted data was copied or modified.

## Supabase and release status

The authenticated Supabase CLI already reaches the linked AdaptBuddy project. No password or API key needs to be pasted into chat. Only read-only catalog inspection has been performed against the hosted project; these SQL changes have not been applied there.

All SQL candidates remain outside `supabase/migrations`:

- `041_profile_authority_boundary.sql`: smaller containment candidate; this and the broad draft are not interchangeable rollout steps. The broad draft includes the same profile boundary plus disruptive relationship cleanup.
- `041_safeguarding_access_guardrails.draft.sql`: broad relationship/admin quarantine candidate; requires affected-record inventory, a backup and a staged recovery/re-verification rehearsal.
- `042_atomic_support_record.sql`: in-app support recording only; depends on reviewed child/adult access rules and the relevant existing tables.
- `043_profile_details_compatibility.sql`: adds the missing editable profile field and accepts current options while preserving legacy values; tested through the local API.

Do not merge/deploy this candidate yet. The live effect of migration 040 is still missing; source and schema must be released in a tested order. New request actions intentionally fail closed on servers without their versioned functions.

Remaining release work:

1. Continue the free local rehearsal with dedicated concurrent acceptance/suspension and classroom approval checks, downstream policy review, and migration/recovery testing. Basic email-confirmed signup, profile permissions, note privacy, revocation and concurrent support retries now pass against the restored live public schema. Hosted configuration, delivery providers and load remain separate checks. The inactive older project has not been repurposed.
2. Confirm rotation of the historically exposed administrator credential and revocation of its old sessions; verify legitimate administrator provenance. Removing source credentials does not revoke them.
3. Decide exactly what accepted contact email permits. The broad draft still creates the historical parent-dashboard relationship on email acceptance; wider guardian authority and all downstream policy scopes need review before release.
4. Complete invitation delivery and accept/decline UI, eligible recipient routing, external delivery/receipts/retries, escalation and adult response/closure. A successfully recorded request is not evidence that anybody saw it.
5. Complete safeguarding ownership, response expectations, retention and DPIA decisions, and review child guidance/accessibility in the full disclosure journey.

This work improves the reviewed code and provides executable evidence. It does not make the child safeguarding pathway ready for a live pilot.
