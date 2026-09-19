# PR #15 safeguarding review — 8 September 2026

**Original snapshot review:** keep PR #15 in draft. Subsequent repairs and their test evidence are recorded in [FIXES_AND_VALIDATION.md](FIXES_AND_VALIDATION.md). The original observations below remain as the review history.

Reviewed [PR #15](https://github.com/Watchman77/Adaptbuddy-Platform/pull/15) at `ccb40b27d2e5e8bcff99883fbc07a3decd59a752`, against base `7dc5e73a43a9b8799c615648cbd456a59b087e11`. This is an engineering review and policy comparison, not a safeguarding or legal compliance certification.

## Urgent finding in the linked database

Read-only catalog queries reached **AdaptBuddy Project**, project ref `fmlxtlicawkgiemubyid`, at approximately 06:11–06:13 UTC on 8 September. This matches the project's local Supabase configuration. No child/adult records were retrieved, no exploit was attempted, and no application tables, policies, functions or data were changed.

The effective database rules permit authenticated users to update their own `profiles.role`. The `Users can update own profile` policy restricts row ownership but does not protect authority fields, and there is no profile-security trigger. The live `is_admin()` function trusts only `role = 'admin'`. The signup trigger also accepts the role supplied in user metadata. This establishes a role-escalation path from the observed grants, policies and function definitions. It is an existing database issue, not a new defect introduced by PR #15.

**Priority:** prepare and test a narrowly scoped authority-field/signup-role fix before expanding the pilot. Separately rotate the historically exposed administrator password, revoke its sessions, and inspect privileged activity through the authorised operator. Do not reproduce an exploit against real accounts. A code-only password removal does not invalidate the old credential.

The audit also confirmed:

- `mood_check_ins.is_shared` is absent; the effect of migration 040 is missing. The older policy still allows connected adults to read mood check-ins without a sharing predicate.
- The draft's trusted-adult acceptance and privileged-verification columns are absent.
- `link_child_by_buddy_id` still exists, is executable by authenticated users, and creates connected relationships without an acceptance step.
- `add_trusted_adult_for_child`, acceptance/revocation functions, and draft quarantine tables were absent in this linked database. Therefore repository migration history must not be assumed to match deployed schema.
- RLS is enabled on the inspected tables, but the policies above demonstrate why that alone is insufficient.

## Findings in the proposed release

### [P1] Coordinate the frontend with the missing database fields

The new trusted-adult SELECT requests `accepted_at`, `accepted_by` and `acceptance_method`. None exists in the linked database, and none is defined in committed migrations through 040. Both the child settings query and the parent query will fail. The parent query participates in the dashboard's `Promise.all`, so this can prevent the whole parent dashboard from loading. The only proposed schema change is explicitly outside the migration sequence.

Evidence: [child service lines 119–125](https://github.com/Watchman77/Adaptbuddy-Platform/blob/ccb40b27d2e5e8bcff99883fbc07a3decd59a752/src/services/supabase/autismProfileService.ts#L119), [parent service line 1690](https://github.com/Watchman77/Adaptbuddy-Platform/blob/ccb40b27d2e5e8bcff99883fbc07a3decd59a752/src/features/parent/services/parentDashboardService.ts#L1690).

Required change: establish a tested schema capability/release gate. Keep invitation actions unavailable until the matching server contract is present; do not fall back to an older authorising RPC or label a failed fetch as a confirmed empty recipient list.

### [P1] Do not present a legacy connected relationship as harmlessly pending

The application still calls `add_trusted_adult_for_child`. On a database with migration 011's implementation, that function connects an existing matching adult and can insert the parent access relationship immediately. The new mapper then hides the connected status when acceptance evidence is absent, while Settings says the adult cannot see updates. The UI does not undo the server-side grant. A local mocked-RPC probe confirmed the mismatch: a returned `connected` row becomes `pending`. This older RPC is absent in the linked database inspected today, so this is a concrete compatibility defect for the documented migration-011 deployment path, not an observed live invocation.

Evidence: [service call at line 148](https://github.com/Watchman77/Adaptbuddy-Platform/blob/ccb40b27d2e5e8bcff99883fbc07a3decd59a752/src/services/supabase/autismProfileService.ts#L148), [Settings success copy at line 187](https://github.com/Watchman77/Adaptbuddy-Platform/blob/ccb40b27d2e5e8bcff99883fbc07a3decd59a752/src/features/child/pages/SettingsPage.tsx#L187), migration 011 lines 45–103.

Required change: use a versioned pending-only server contract, or fail closed before the RPC until its implementation is verified. Test both old and new schema deployments.

### [P1] Make the new profile trigger compatible with OTP signup

Draft 041 rejects an authenticated user's change to `email_verified_at`. Existing `upsertUserProfile()` writes a fresh client timestamp after OTP verification, while the new signup trigger initially leaves that field null. Applying the draft therefore causes the normal signup upsert to fail; the revised auth store then signs the user out. This is established by the two code paths, not by executing the SQL.

Evidence: [draft trigger lines 261–276](https://github.com/Watchman77/Adaptbuddy-Platform/blob/ccb40b27d2e5e8bcff99883fbc07a3decd59a752/supabase/migration-drafts/041_safeguarding_access_guardrails.draft.sql#L261), [signup payload line 292](https://github.com/Watchman77/Adaptbuddy-Platform/blob/ccb40b27d2e5e8bcff99883fbc07a3decd59a752/src/services/supabase/authService.ts#L292).

Required change: derive canonical email/verification and authority fields on the server, stop client writes to those fields, and test child, parent, teacher, email-OTP and existing-account flows against the proposed schema.

### [P1] Invalidate delayed authentication work on account transitions

`applyAuthSession()` loads a profile asynchronously and then unconditionally reinstates that session. A local runtime probe using the actual compiled auth store reproduced: SIGNED_IN starts a delayed profile load; SIGNED_OUT clears state; the older load finishes and restores the child's profile/session into the UI. The Supabase token was not restored by this probe, but private UI state and authenticated-route state were. Clearing state before the await does not prevent this race.

Evidence: [auth store lines 218–228](https://github.com/Watchman77/Adaptbuddy-Platform/blob/ccb40b27d2e5e8bcff99883fbc07a3decd59a752/src/store/authStore.ts#L218).

Required change: use an authentication-transition generation/token, invalidate it on sign-out/guest/account changes, and reject stale results after every profile await. Cover sign-out, guest entry, account A→B, startup, and refresh in runtime tests. The broader race predates this PR; it remains a blocker for its identity-isolation claim.

### [P1] Revoke derived class access across every relationship-removal path

The new child revoke RPC pauses memberships, but the unchanged adult-facing `unlink_child_from_parent` RPC deletes the trusted-adult row directly. The new delete trigger removes only the family relationship; it does not clear the adult's class approvals or pause derived memberships. Existing teacher access paths can therefore remain after an adult uses the existing unlink flow. Similar lifecycle cases need coverage for identity deletion, guardian-verification withdrawal, teacher suspension and class ownership changes.

Evidence: [draft delete trigger lines 659–664](https://github.com/Watchman77/Adaptbuddy-Platform/blob/ccb40b27d2e5e8bcff99883fbc07a3decd59a752/supabase/migration-drafts/041_safeguarding_access_guardrails.draft.sql#L659), migration 017 lines 68–77, and Parent Hub's existing unlink action.

Required change: centralise revocation/invalidation at the database boundary and test every supported lifecycle path with different accounts. Restrict reads using current authority, not only historical approval flags.

## Remaining workflow blockers

The PR correctly discloses these limitations, but disclosure does not make the workflow complete:

- Journal, support-signal and alert creation are still separate browser writes. A later failure can leave a saved disclosure without its alert; retries can duplicate entries.
- There is no delivered invitation with an accept/decline experience, verified recipient delivery, receipt, retry or escalation worker.
- Worry Diary still uses client-side assessment and can close after saving without urgent guidance. Its unchanged privacy copy still says AdaptBuddy can alert an authorised adult.
- No trained safeguarding owner, response expectations, incident process, retention decision or completed DPIA was supplied for verification.

## Verification completed

- Reconstructed the exact PR source in an isolated `/tmp` directory; did not switch or edit the user's application branch.
- `npm run build`: passed, with one unused `mapBuddyLinkResult` lint warning.
- Build prechecks: Buddy safety suite and trusted-adult static source checks passed.
- `npm test -- --watchAll=false --runInBand`: **1 suite / 1 landing-page test passed**. This PR does not contain the local branch's 66-test neuro-feature suite.
- Two isolated runtime probes confirmed legacy-status masking and stale authentication completion. Synthetic data and mocked Supabase only.
- Reproduce the observed defects with `node docs/reviews/pr15/reproduce-pr15-review.cjs /tmp/adaptbuddy-pr15-review-ccb40b2`. This diagnostic asserts the observed bad behaviours; its successful exit means reproduction succeeded, not that the product passed a safety test.
- Supabase metadata audit: completed against the linked project; no child/adult records or mutations.
- Draft SQL was not executed against PostgreSQL or Supabase. No local PostgreSQL/Docker runtime was available. SQL findings are code/schema review, not a passed migration rehearsal.
- Local ADHD/Dyslexia changes remain intact. An apply-check identified a conflict in `ChildDashboardPage.tsx` when combining them with the PR snapshot; no merge was performed.

## Policy comparison

[Keeping Children Safe in Education 2026](https://www.gov.uk/government/publications/keeping-children-safe-in-education--2) is in force from 1 September 2026 and applies to schools and colleges in **England**. It is not a UK-wide product certification. The product needs to support the school's safeguarding procedures and human responsibility; different national deployment contexts need their own review.

[DfE's generative AI product safety standards](https://www.gov.uk/government/publications/generative-ai-product-safety-standards/generative-ai-product-safety-standards) address monitoring/reporting, security, privacy, testing, governance and directing distress to human support. The honest delivery copy and server-side AI boundary are useful progress. They do not establish a working reporting pathway or independently evaluated safeguarding performance.

[ICO Children's Code DPIA guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/2-data-protection-impact-assessments/) calls for child-focused risk assessment early in design, including necessity, proportionality, lawful basis, special-category conditions where relevant, consultation and recorded mitigation. These decisions must shape routing/access and retention, rather than being added after launch.

The present recommendation is based on the concrete engineering gaps above, not merely on the PR's draft warning.
