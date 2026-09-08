# Scoped support enablement — 8 September 2026

**Prepared and verified locally; not applied or deployed to production.** The owner requested new adult invitations and support recording. The candidate enables both application flags, adds the adult inbox, and prepares the required database changes. Production remains on `4e4fd67e664cd00ec86a4d99923bdb6e20129a3f` with both capabilities disabled.

The owner has now confirmed the existing administrator account and explicitly stated that its previously exposed password has not been changed yet. Administrator identity is resolved; password rotation remains pending. The confirmed email and these two distinct states are saved in a private release-plan file outside Git. Do not ask the owner to identify the account again or mark password rotation complete without their confirmation. No administrator verification or live enablement has been applied. No plan upgrade, new hosted project, real invitation email, live test account, or billable AI request was made for this work.

## Behavior and permission boundary

- A confirmed active child can create an in-app invitation. The invited confirmed active parent account can decline or attest it is 18 or over and accept. Email possession and self-attested adulthood do not establish guardian or school authority.
- Acceptance grants access only to generic support requests the child explicitly addresses to that connection. It creates no legacy `trusted_adults` or `child_relationships` row, class access, shared journal, alert, or signal.
- Each request defaults to a private record. Its content consists of source, urgency, recipient, timestamps and an optional seen receipt. Private journal text, mood notes, conversation text and AI analysis are not copied.
- The adult can mark an addressed request as seen. The child sees that receipt, with no claim that help has been provided. Invitations and requests send no email/text alert, promise no response time, and direct children to an adult nearby.
- Either party can end a connection. Account suspension or canonical identity changes revoke consent. A new invitation creates a new consent lifecycle and cannot restore old records.
- Accepted connections appear before pending invitations and closed history. A child can have ten open invitations/connections; an adult can accept fifty connections. The bounded hundred-item list therefore retains every accepted connection and its revocation control. Older pending/history items may be outside that list. Request history is limited to the latest hundred records.
- Guest mode cannot create real invitations or records. Account changes discard the previous inbox and recipient selection. Separate mood submissions receive separate request IDs even when Buddy replies identically; a retry of the same request retains its ID.

## Security finding and repair

The hosted baseline permits a normal account to write its profile role or supply an admin signup role. `is_admin()` trusts that role, and `admin_reset_user_password` can then reset another account's credentials. Correct recipient checks alone cannot protect support records against that account-takeover route.

The narrow `041_profile_authority_boundary.sql` protects canonical identity and administrator-verification fields, sanitizes signup roles, and requires administrator provenance supplied through the service role and an existing, unexpired Auth session matching the bearer token. Verified administrators retain ordinary account creation, role editing and account approval; they cannot forge verification fields through browser updates. Both the deployed eight-argument account-creation contract and the current browser's nine-argument contract, including sex, are supported. Newly assigning the admin role still does not supply administrator provenance.

`044_scoped_support_connections.sql` uses dedicated tables with no browser table privileges and bounded authenticated RPCs. Recipient identity, current consent and child ownership are checked on the server. Mutation locks serialize acceptance and recording with identity changes and revocation. Idempotency binds source, urgency and recipient, so altered retries cannot reuse an earlier consent decision.

The broader school/guardian quarantine draft and older shared-support draft are not part of this release. Historical school access, retention/DPIA decisions, incident handling and staffed monitoring remain separate checklist work. No staffed monitoring arrangement has been confirmed; the candidate makes no monitoring or response-time promise.

## Verification

Outcome: the identified paths are fixed in the local candidate; live enablement is blocked on the pending password change above.

| Gate | Command / evidence | Result |
| --- | --- | --- |
| Syntax and types | `git diff --check`, `npx tsc --noEmit` | Pass |
| Original trigger and real account controls | `node scripts/test-support-connections-local.cjs` against disposable local Supabase, restored from the exact hosted schema plus scoped 040/043 and candidate 041/044 | 21 checks pass |
| Concurrency | `node scripts/test-support-connections-concurrency.cjs` | 10 checks pass |
| Atomic release and identity gate | `node scripts/test-support-release-local.cjs` | Rejects missing owner confirmation, unrotated password, wrong project and absent admin; valid synthetic admin and row counts survive |
| Existing security checks | `npm run test:safeguarding` | Buddy checks, static checks, 17 auth/privacy checks, 22 profile-authority and 31 legacy draft SQL fixture checks pass |
| Application regression | `CI=true npm test -- --watchAll=false --runInBand` | 19 suites / 78 tests pass |
| Enabled production build | `npm run build` | Pass; `main.8006574b.js`, `main.d54c93d3.css` |

The original admin-metadata, self-promotion and credential-reset attempts fail through real local Auth/PostgREST. Revoking a synthetic administrator session originally left its bearer token authorized; after the fix, the same token immediately fails `is_admin()` and password-reset authorization. Ordinary confirmation, invited-adult acceptance, child-private saves, selected-recipient reads, administrator creation through both signatures, login by an admin-created user, and verified-admin role editing succeed. Unrelated adults, teachers and administrators cannot read the new support inbox. Deleting a synthetic acknowledged recipient does not break foreign-key cleanup or remove the child's separate private record.

One fresh read-only investigator and one fresh read-only reviewer were used as required by the fix-finding skill. Confirmed review issues were corrected: repeated-response request IDs, active connections hidden by history/invitation flooding, and administrator editor/RPC compatibility. A final parent-run test also reproduced and repaired stale administrator-token authority after session revocation. Final relevant tests passed after those corrections. Existing React test-library/router deprecation warnings remain; no application build errors remain.

The local project was `adaptbuddy-local-rehearsal`, with API and captured confirmation mail bound to localhost. Test scripts require that project name and its separate Docker socket. Synthetic results and logs remain outside Git. These checks do not claim hosted restore privilege or end-to-end verification on production.

Simply leaving this account unverified is not a complete temporary suspension: some historical product-feedback and class permissions still test the raw admin role instead of `is_admin()`. That alternative was inspected but not applied. The existing reviewed release sequence remains unchanged.

## Exact release order

1. Administrator identity is confirmed. Obtain confirmation of password rotation when the owner completes it. Revoke its old sessions as part of release preparation; do not record passwords or tokens. Keep the confirmation in private operational evidence.
2. Verify CLI project reference `fmlxtlicawkgiemubyid`, take a fresh private backup of the affected hosted schema/data and record aggregate preflight counts. Confirm the scoped 040/043 release still exists. Do not use another Supabase project or the broad 041/042 drafts.
3. Create a private plan JSON with `projectRef`, `adminEmail`, `adminIdentityConfirmedByOwner: true` and `adminPasswordRotated: true`, using actual owner confirmation. Run `node scripts/prepare-support-release.cjs <private-plan.json> <private-output.sql>`. The generator does not connect or deploy. Its output is private and must not be committed.
4. Apply that generated transaction to the confirmed project. It locks and verifies the selected active, confirmed existing admin, applies the narrow authority boundary, verifies only that admin, and creates the scoped support contracts atomically. A missing/mismatched administrator aborts the transaction.
5. Read back authority, grants, RLS, RPC signatures and aggregate counts. Verify ordinary authenticated behavior before deploying the enabled build. Use only explicitly authorized real accounts; do not create children or send mail as a smoke test.
6. Merge/push the exact verified source and create a Production build in Vercel project `adaptbuddy-platform`. Verify the commit, Ready status, both production domains and required routes. Do not assume a Git push triggered deployment.

If the web release regresses, restore the prior scoped Vercel deployment or disable both checked-in flags and rebuild. Preserve the stricter profile permissions and private support data. Do not restore the vulnerable role-based authority check as a rollback. Any database correction should be a forward repair from a verified backup and the reviewed transaction, not a broad draft replay.
