# AdaptBuddy Admin Console

The repository contains administrator UI surfaces and a service-role bootstrap script. Every privileged operation still needs server-side authorisation and multi-account testing before pilot use.

## Live security action required

The previous bootstrap credential was stored in source control and must be treated as exposed, including in a private repository. Removing it from the current branch does not remove it from history.

1. Rotate the existing administrator password directly in Supabase Auth.
2. Revoke the account's existing sessions and review recent authentication and administrator activity.
3. Store the replacement only in an approved secret manager.
4. Implement and verify MFA and assurance-level enforcement for every administrator before a pilot or production launch.

The bootstrap script does not print credentials and deliberately does not change the password or sessions of an existing account.

## Database proposal — do not apply

`migration-drafts/041_safeguarding_access_guardrails.draft.sql` is a security design proposal, not an approved migration. Do **not** apply, rename, or promote it until an independent database/RLS audit and staged rehearsal are complete.

The earlier numbered migrations remain the current repository history. In particular, migrations `004_admin_role_enum.sql` and `005_admin_platform.sql` were designed to be applied separately because PostgreSQL must commit the `admin` enum value before it is used. This note does not authorise any live database change.

## Controlled bootstrap or re-verification

Use a secure local shell or controlled deployment job only after the relevant database design is approved. Never put the service-role key or administrator password in frontend code or in any browser-exposed `REACT_APP_*` variable.

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=read-from-your-secret-manager
SUPERADMIN_EMAIL=your-authorised-admin@example.com
SUPERADMIN_PASSWORD=a-new-high-entropy-secret
```

Then run:

```bash
node scripts/seed-superadmin.js
```

- For a new account, `SUPERADMIN_PASSWORD` is required and must be at least 16 characters.
- For an existing account, rotate its password and revoke sessions in Supabase Auth first. The script leaves both untouched.
- The script records `admin_verified_at`, `admin_verified_by`, and `admin_verification_method` only where the reviewed schema supports them.
- Remove temporary local secrets immediately after the command completes.

## Intended post-review boundaries

The draft proposal aims to establish these properties; they are not current production guarantees:

- Public signup metadata cannot create an administrator.
- A user session cannot change its canonical email, role, verification, status, or authorisation fields.
- Active administrator access requires an active, authorised admin profile with service-role verification evidence.
- Creating or promoting another administrator is a controlled service-role operation.
- `SUPABASE_SERVICE_ROLE_KEY` remains server-only and is never committed, logged, or exposed through client code.

Before release, verify each property with separate authorised and unauthorised accounts, secret scanning, dependency checks, and database policy tests.
