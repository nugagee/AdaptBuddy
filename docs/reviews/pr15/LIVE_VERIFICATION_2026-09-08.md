# Scoped live verification — 8 September 2026

> Superseded release state. This record captures the temporary release in which new adult invitations and support recording were disabled. The later adult-support release enabled those functions after the 041/044 database contracts were applied and verified. See [LIVE_SUPPORT_VERIFICATION_2026-09-08.md](LIVE_SUPPORT_VERIFICATION_2026-09-08.md) for the later state.

## Historical outcome

The scoped release was deployed from `4e4fd67e664cd00ec86a4d99923bdb6e20129a3f`. It kept incomplete application recording paths disabled and did not claim that all backend safeguarding findings were fixed.

- Vercel deployment `HxsNM6PsHa5opyUAWxTiVQ4rA92S` reached Production / Ready.
- <https://www.adaptbuddy.co.uk> and <https://www.adaptbuddy.com> served the same HTML and assets.
- Homepage, asset, login, signup, Settings and Buddy routes returned HTTP 200.
- Anonymous ordinary chat returned 401.
- A deterministic safety-only probe returned direct-adult guidance without entering the paid AI path.
- Supabase Free and Vercel Hobby were retained.
- No hosted test account, external email or billable AI request was created.

## Historical database boundary

The scoped 040/043 SQL transaction was applied to Supabase project `fmlxtlicawkgiemubyid`. Metadata readback confirmed `profiles.sex`, expanded gender options, private-by-default mood entries and the stricter adult-read policy. Existing row counts and child-access policy were preserved. Invitation and support RPCs were intentionally absent at this stage.

That boundary changed in the subsequent adult-support release. The later record confirms that the narrow 041 authority boundary and scoped 044 support transaction were applied and the in-app controls enabled.

## Verification evidence

1. `git diff --check` and `npm run build` passed.
2. Safeguarding checks passed 17 application runtime checks, 21 profile PostgreSQL checks and 31 trusted-adult PostgreSQL checks.
3. The application suite passed 18 suites and 69 tests.
4. The exact local database combination passed 12 checks using the hosted schema, the scoped 040/043 transaction and synthetic local accounts.
5. Live read-only checks passed for both production domains at `2026-09-08T17:47:59.587962+00:00`.

An independent candidate review found one false empty-state message when connection lookup was disabled. The message was corrected and covered by an existing-contact regression test before release.

This document remains in the repository as an audit trail showing why the functions were initially disabled and what evidence preceded their later enablement. It must not be used as the current feature-status record.
