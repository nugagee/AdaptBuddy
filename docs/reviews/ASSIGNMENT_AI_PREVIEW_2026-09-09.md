# Assignment AI preview review — 9 September 2026

## Result

The implementation is available in a protected Vercel preview. Real-provider evaluation and production release are still pending. The preview key and feature switch are configured; a real teacher/admin sign-in is still required. No real OpenAI evaluation requests were made during this preview preparation.

- Draft [PR #16](https://github.com/Watchman77/Adaptbuddy-Platform/pull/16), base `upload/adaptbuddy-web`, head `codex/assignment-ai-assistant`.
- Reviewed source commit: `e06bd777176e3d04067a7e5ed37a4eae8ed62b2f`.
- [Vercel deployment](https://vercel.com/watchman77s-projects/adaptbuddy-platform/FBbWtBUaY4hVXXTXEWGCRzUUKUZj): Ready, Preview; source commit and branch match. No production domains assigned.
- [Preview assignment workflow](https://adaptbuddy-platform-git-codex-assig-3fd86d-watchman77s-projects.vercel.app/teacher/assignments).
- Vercel standard deployment protection is enabled. The authenticated Vercel browser reaches AdaptBuddy's separate app login when opening the assignment workflow.

## Initial environment configuration

Added nonsecret `ASSIGNMENT_AI_ENABLED=true` for **Preview, branch `codex/assignment-ai-assistant` only**. Vercel confirmed the save and displayed the branch scope. A new preview deployment is needed for it to take effect.

The existing `OPENAI_API_KEY` remains a write-only **Production-only** secret. No key was revealed or copied, and its scope was not changed. The user has been asked to add a test key directly in Vercel for this preview branch and sign in to AdaptBuddy in the preview. Do not redeploy until the preview key is configured.

The preview shares the current Supabase connection with production; it is **not a separate test database**. The Assignment AI endpoint reads only the caller's profile and owned class for authorization and makes no database writes. Use synthetic task text, leave assignments unpublished, and avoid adding student records for this review.

## Production verification

Both `www.adaptbuddy.co.uk` and `www.adaptbuddy.com` still serve the prior release:

- HTML SHA-256: `c4c7d5390b6327eabd275e765ceb00e5c46f311781fa27a225c0157472d9e013`.
- Main script: `/static/js/main.938243be.js`.
- Main script SHA-256: `b55ca01957010d7459865fc4bab6a37d627c759be78fe6a4a57eb7d360be8876`.

The preview branch was pushed and the draft PR created. No merge, production deployment, plan upgrade, database migration or assignment publication was performed.

## Pending evaluation

Use the seven synthetic cases in `assignment-ai-preview-cases.json`. These are proposed checks, not observed model results. Review relevance, response latency, enum-only output, rejection of embedded instructions, draft-only tool selection, stale-result cancellation and manual fallback. Respect the five-requests-per-minute per-instance limit. The automated tests use provider mocks and do not establish real recommendation quality.

After the user adds the preview key, deploy the same reviewed branch once to pick up both environment changes. Complete the authenticated teacher-owned-class workflow and owner review before release.

Automated implementation validation already completed: 29 API checks, 22 app suites / 91 tests, TypeScript and production build. Full details are in `docs/AI_ROADMAP.md`.

## Follow-up after the owner confirmed paid OpenAI access

Rechecked Vercel: `OPENAI_API_KEY` exists as a Secret, still scoped to Production only. Paid provider access does not make a Production-only Vercel variable available in Preview. The existing edit form permits Production plus general Preview, but selecting a custom preview branch changes it to Preview only. Those edits were cancelled without saving; the production key was preserved.

Prepared a separate, **unsaved** Secret entry named `OPENAI_API_KEY`, scoped only to `codex/assignment-ai-assistant`. Its value is empty, ready for the owner to paste the existing key directly in Vercel and save. No secret was read, copied, rotated or exposed.

Browser checks on the deployed preview:

- Opening `/teacher/assignments` while signed out redirects to `/login`.
- Teacher guest mode displays the new Assignment AI Assistant and its data-sharing/review explanation.
- Guest mode displays “Sign in with a teacher account to use Assignment AI. Guest mode does not make AI requests.” The AI request controls are unavailable.
- Entered the synthetic reading title/instructions and selected Read aloud manually; the checkbox updated correctly.
- With no guest-owned class, Publish assignment stays disabled; no assignment was published.
- Signed out of the guest session after the check.

At that point, the real-provider test remained pending the preview-scoped key and a signed-in authorized teacher/admin with an owned class. No provider result or recommendation-quality pass was claimed.

## Preview key saved and redeployment started

The owner created and saved a new `OPENAI_API_KEY` Secret for Preview. It initially applied to all Preview branches; narrowed that new entry to `codex/assignment-ai-assistant` using the branch selector, without reading or changing its secret value. Vercel confirmed the successful update and displayed the correct branch. The separate Production key remains present and unchanged.

Completed one redeployment of reviewed commit `e06bd777176e3d04067a7e5ed37a4eae8ed62b2f`, explicitly selecting Preview. The only assigned domain in the confirmation was the test branch alias. New deployment: [3kcxnvkNBMigv8P1Bk6mXC9kWSJB](https://vercel.com/watchman77s-projects/adaptbuddy-platform/3kcxnvkNBMigv8P1Bk6mXC9kWSJB), **Ready**, build duration 1m 43s, custom production-domain assignment skipped. Immutable URL: `https://adaptbuddy-platform-c3v1bh7ok-watchman77s-projects.vercel.app/`.

The preview assignment route still requires app sign-in. Asked the owner to sign in with an authorized teacher/admin account; no credentials or authentication tokens were requested in chat.

Both live domains were checked again and their HTML SHA-256 still matches the prior-release hash above. A direct browser navigation to the new API route was blocked by the browser client (`net::ERR_BLOCKED_BY_CLIENT`); this is not an API pass/fail result. No real provider request has run. The next verification must use the signed-in assignment UI.

## Teacher sign-in confusion found during review

After the owner reported opening a teacher account, the preview still displayed **Teacher Guest** / `guest-teacher@adaptbuddy.local`, with AI controls unavailable. This confirms only the browser's guest session; it does not establish whether the owner registered a separate teacher account elsewhere. Requested the registration email to verify the intended account without asking for a password.

Source inspection found two confusing paths: `/login` labelled the guest entry button simply “Teacher”, while `/teacher` displayed a legacy school/email/password form whose submit handler only wrote a local `teacherSession` and simulated success. Corrected both paths in the review branch:

- Demo links explicitly say Child demo, Parent demo and Teacher demo.
- The legacy Teacher Portal routes to the shared real login, preserving the teacher destination.
- The guest Assignment AI panel offers a direct account sign-in link.

The focused routing and Assignment AI checks passed: 3 suites / 8 tests. TypeScript and the production build passed, including all existing prebuild checks and 29 Assignment AI API checks. Refreshed preview verification is recorded after completion below. Authentication/authorization controls have not been relaxed to make the evaluation pass.
