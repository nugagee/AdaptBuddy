# Live adult-support release verification — 8 September 2026

> Historical release evidence. This record describes the adult-support release made on 8 September 2026. The current production source moved to `8c22856ae0c8574acce9ced40cb06e2608cb093a` through PR #16 on 12 September 2026. That later release passed the complete AdaptBuddy CI workflow and a successful Vercel production deployment.

## Outcome

New in-app adult invitations and support recording were enabled on both production domains. This completed the requested scoped enablement. It did not certify the remaining school/guardian authority or safeguarding-operations checklist.

- Release source: `1a25b261b481bd316cb8a89c2dba08daaf16d5e4` on `upload/adaptbuddy-web`.
- Vercel project: `adaptbuddy-platform`; deployment `2EnbjTmu73BubErzL2jppCnV8uRE` was Production, Ready and Current at verification time.
- Live URLs: <https://www.adaptbuddy.co.uk> and <https://www.adaptbuddy.com>.
- Both domains returned HTTP 200 and identical HTML and asset hashes during verification.
- The separate Changers deployment trigger was later disconnected; see [PROJECT_SEPARATION_2026-09-09.md](PROJECT_SEPARATION_2026-09-09.md).

## Database and administrator evidence

The owner confirmed the intended administrator and subsequently confirmed password rotation. The narrow 041 authority boundary and scoped 044 support transaction were applied to Supabase project `fmlxtlicawkgiemubyid`. All sixteen affected function definitions and authenticated/anonymous execution grants matched the tested local database.

Existing row counts were preserved: seven profiles, two historical trusted adults, two historical child relationships and one private mood check-in. There were no journal entries, alerts or parent-child signals. New support tables remained empty throughout deployment checks. Non-identity profile fields were preserved and canonical identity values matched Auth. Direct authenticated/anonymous table access was denied and RLS was enabled on both new tables.

The production public client configuration pointed to the intended Supabase project. Anonymous HTTP calls to both inbox RPCs and both tables returned 401 with PostgreSQL permission-denied code 42501. Verification used the public publishable key served by the application. No private key, password or Auth session token was recorded in this report.

## Live application evidence

Both domains served the enabled invitation, explicit-recipient support and seen-receipt controls. Login, signup, Settings and Buddy SPA routes returned successfully. Ordinary anonymous Buddy chat returned 401. The deterministic safety route gave direct-adult guidance and stated that no email or text alert had been sent. These probes did not call paid AI or create database records.

The application suite passed 19 suites and 78 tests, with 21 real local Supabase checks and ten concurrent database cases passing during preparation. The enabled build passed locally and on Vercel. No production user was impersonated and no invitation, support record or test account was created.

## Supported behaviour and limits

Children can invite a trusted adult from Settings. The adult signs in using the invited email and opens Parent Hub to accept or decline. Buddy and mood support actions let the child keep a private record or choose an accepted recipient. Adults can mark requests as seen or end a connection.

These are in-app invitations and records. They do not send email or text alerts and do not promise a response time. Remaining delivery, escalation, school-access, retention, DPIA and response-ownership work stays governed by [COMPLETION_CHECKLIST.md](COMPLETION_CHECKLIST.md).

## Backup and recovery record

The private backup was stored outside Git at `/Users/mac/Library/Application Support/AdaptBuddy/private-backups/2026-09-08-support-190925Z`. Its permission-restricted manifest contains hashes for the affected profiles, schema, transaction and verification evidence. It contains no passwords, private API keys or Auth session tokens.

The web rollback point at the time was deployment `HxsNM6PsHa5opyUAWxTiVQ4rA92S`, source `4e4fd67e664cd00ec86a4d99923bdb6e20129a3f`. Database permission tightening and private support data must be retained during any rollback. Supabase remained on Free and Vercel on Hobby; no plan upgrade or hosted preview project was created.
