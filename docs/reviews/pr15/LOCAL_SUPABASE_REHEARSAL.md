# Free local Supabase rehearsal — 8 September 2026

The owner chose to retain Supabase Free and defer Pro. No subscription change, payment or production migration was submitted. The existing live website returned HTTP 200. An HTTP 405 response from a GET to `/api/buddy` confirmed the deployed route, but did not exercise AI generation or verify OpenAI billing. The user reports an existing OpenAI subscription.

## Environment and scope

Colima and the Docker CLI were installed through Homebrew. A dedicated `adaptbuddy-rehearsal` VM ran with 2 CPUs, 8 GiB RAM and a 32 GiB virtual disk. It used a separate Docker socket, did not activate the global Docker context, and did not start a login service. Supabase Auth, PostgreSQL 17, PostgREST, Kong and Mailpit ran on a Docker network whose published ports bind to `127.0.0.1`.

The local project was freshly initialized as `adaptbuddy-local-rehearsal`, with no hosted project link or production SMTP configuration. Confirmation emails were captured locally. No external recipient was contacted and no OpenAI request was made by these tests.

A schema-only dump of the confirmed live AdaptBuddy project (`fmlxtlicawkgiemubyid`) restored successfully: 26 public tables and 92 policies. The dump contained no INSERT or COPY statements. The Auth profile-creation trigger was inspected separately and recreated locally. All accounts and records used by the tests were synthetic. The private schema dump and local credentials were not committed.

## Finding and repair

The initial API run passed 18 of 19 checks. The full application profile payload failed with PGRST204 because the hosted schema has no `profiles.sex` column. Its legacy gender constraint also does not accept the current application's `man`, `woman` and `non_binary` options.

The proposed `043_profile_details_compatibility.sql` adds the missing nullable field and allows current gender options while preserving legacy values. It does not infer sex from gender, rewrite existing demographic values, or replace administrator functions. Blindly replaying historical migration 007 is unsuitable: that migration rewrites gender values before replacing the old constraint and changes administrator functions too.

After a fresh restore of the same schema and application of the smaller profile-authority candidate, the final integration run passed **21 of 21 checks**. The test subsequently applied the compatibility candidate, then the broad access draft, mood privacy migration 040 and atomic support candidate, within the local database only.

Verified at 2026-09-08T16:30:02.637Z. Schema SHA-256: `c0ca015ae4660ff9ddc7f3b361f802319639720a615d91d73671a8e724549ccb`.

- Real signup, local email confirmation and profile synchronization
- Signup metadata cannot create an administrator
- Teacher signup remains pending and unauthorised
- Authenticated profile updates cannot change role or verified email
- Ordinary profile details remain editable
- Profile compatibility preserves legacy values without inferring sex
- Current profile options save and invalid values are rejected
- Full application signup profile payload is accepted
- Cross-account profile read is isolated
- Signed-out API cannot read child profile
- Refresh session remains attached to the same child
- Full access, mood privacy and support drafts apply to live schema structure
- Child request remains pending with no adult access
- Unrelated adult cannot accept the invitation
- Matching confirmed adult can accept once
- Private journal remains invisible to accepted and unrelated adults
- Mood note is private by default and shared only after child action
- Concurrent support retries produce one complete record set
- Insert failure rolls the whole support transaction back
- Revocation immediately removes linked access with existing JWT
- Anonymous callers cannot invoke support recording

## Repeat the integration checks

Use a disposable local project with the fixed project ID `adaptbuddy-local-rehearsal`, a dedicated Colima profile `adaptbuddy-rehearsal`, and localhost API/Mailpit ports 54321/54324. Enable email confirmation and keep SMTP local. Restore the public schema without production data, recreate the audited Auth trigger, and apply the smaller profile-authority candidate first. Capture `supabase status --output json` to a mode-600 `status.json` inside the local directory. This file contains local test credentials and must not be committed.

```sh
export DOCKER_HOST="unix://$HOME/.colima/adaptbuddy-rehearsal/docker.sock"
export ADAPT_BUDDY_LOCAL_REHEARSAL=/private/tmp/adaptbuddy-local-rehearsal
node scripts/test-supabase-local.cjs
```

The script rejects non-local API URLs and other Docker profile sockets. It creates synthetic local identities, applies the reviewed draft files locally and writes its result file to the local rehearsal directory. For an independent migration rehearsal, restore a fresh synthetic baseline between runs. Do not run it against a development database containing records you need to keep.

## Release limits

These are actual GoTrue/PostgREST/PostgreSQL integration checks against the full public schema, extending the earlier mocked-module and PGlite evidence. They are not a hosted load test or proof of every policy and administrative function. Eight simultaneous retries were tested; concurrent invitation acceptance versus suspension, email changes and classroom approvals still require dedicated tests. Email acceptance still creates the historical parent-dashboard relationship; wider guardian authority requires policy review.

PR #15 remains draft and unmerged. The candidates remain in `supabase/migration-drafts`. No live SQL has been applied. Remaining release work includes recoverable production backup, legitimate administrator verification and historical credential/session rotation, complete downstream access review, and the invitation/delivery/response workflow and safeguarding ownership decisions described in `FIXES_AND_VALIDATION.md`. Supabase Pro is not a prerequisite for completing these development tasks.
