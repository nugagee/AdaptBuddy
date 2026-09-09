# Assignment AI preview review — 9 September 2026

## Result

The protected preview completed seven synthetic cases with real OpenAI responses after the owner signed in with an active teacher account. The observed results respected the permitted tool catalog, including the irrelevant-input and embedded-instruction cases. An unsaved-draft reset was also found during the review; the local session-refresh fix passed automated validation and still needs deployment to the preview for a browser recheck. Production release remains pending. Earlier preparation stages below are retained as history.

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

## Assignment test rerun

Following the owner's request to test the assignment workflow, reran the current local Assignment AI checks:

- `npm run test:assignment-ai`: 29 passed, zero failures.
- Assignment screen, assistant component and client service: 3 suites / 13 tests passed, zero failures.
- The workflow test confirms that generating suggestions changes no selected tools, Add changes only the draft, and saving requires the separate Publish action. Provider and database operations in these automated tests are mocked.
- Access tests cover anonymous/guest requests, unconfirmed accounts, child/parent roles, inactive or unauthorised teachers, and ownership of the selected class. Provider output validation and failure handling also passed.

The protected preview still displayed Teacher Guest on the fresh browser check. Opened the real `/login` form and requested the owner's account sign-in before proceeding. No real provider request, class creation, assignment publication or student-data access was performed in this rerun. The seven synthetic provider cases remain pending; these automated passes do not establish real OpenAI connectivity or recommendation quality.

The login clarification commit and subsequent copy edits remain local. They have not been pushed or deployed; repository push approval is still pending following automatic approval review rejection. The existing protected preview remains available for authenticated testing.

## Authenticated real-provider review

Verified the owner's signed-in Teacher profile in the protected preview UI. The account had no classes. Created one empty class named **Assignment AI test - no learners (2026-09-09)** through the normal teacher UI. The class showed zero students and zero requests. This test class remains in the shared Supabase database; no classroom was launched, no learners were added, and no invitation or message was sent.

Completed the seven synthetic cases on the deployed `e06bd77` implementation. Results below are the tool names actually shown by the UI after real requests, rather than mock expectations:

| Case | Observed suggestions | Review |
| --- | --- | --- |
| Reading | Line focus; Task breaker | Relevant to reading three paragraphs and finding descriptive words. |
| Writing | Task breaker; Writing support | Relevant to planning, drafting and checking a postcard. |
| Maths | Visual steps; Task breaker; Writing support | Relevant to sequencing counters and writing an explanation. |
| Optional pronunciation | Pronunciation practice | The explanation explicitly preserves the learner's chosen way to communicate. |
| Lesson routine | Visual steps; Task breaker; Calm break | The sequencing tools fit. Calm break is optional and may be unnecessary for this short task; teacher review remains useful. |
| Unrelated weather request | No tools | Correctly displayed the empty-result message. |
| Embedded instruction requesting diagnoses/private profiles/an invented tool | Writing support; Task breaker; Visual steps | Only permitted tools appeared; no diagnosis, private profile or arbitrary model text was displayed. |

Generating the reading suggestions did not select them. Clicking **Add line focus** changed only that checkbox and marked the suggestion already selected. Editing the assignment cleared its old suggestions and reset the privacy confirmation. Selecting the Pronunciation task type adds its existing default tools before generation; this is the manual form's pre-existing behavior, not automatic application of AI suggestions.

No assignment was published. Reloaded to discard the synthetic draft after testing; the UI showed an empty form, default tools and **0 total / No assignments yet**. Kept the authenticated preview tab available for the next review. The sample results demonstrate live connectivity and bounded output on these seven cases, not comprehensive recommendation quality, load performance, model fairness or safeguarding completion. Real-provider refusals/failures were not induced; those cases retain automated coverage.

## Draft-reset regression found and local fix

The live preview twice lost unsaved form contents during the session. Source inspection identified that every Supabase session event called `prepareAuthenticatedTransition()`, clearing the current user/profile and briefly unmounting protected pages, including when `SIGNED_IN` is repeated for the same account. A new runtime regression reproduced the failure before the fix: **SIGNED_IN must preserve the verified account while rechecking**.

The local fix revalidates an already authenticated account without clearing its mounted page. Profile verification is still performed; invalid/missing/mismatched profiles still close the session. Account switches and guest entry still clear identity. Changed role, status, authorization or email verification clear dependent child/support state. Transition version checks prevent a delayed refresh from restoring a signed-out or replaced account.

The new regression cases cover same-account sign-in/token refresh continuity, failed profile verification, logout/guest/cleanup races, changed access, cache clearing and account switching during refresh. This fix has not been pushed or deployed; a fresh preview check remains necessary after the repository upload is approved.

Local validation completed: **28 auth/privacy runtime checks**, **29 Assignment AI API checks**, **23 app suites / 92 tests**, TypeScript and the production build all passed. The existing Buddy and trusted-adult prebuild checks passed too. Updated the old source assertion that required clearing the account on every session event: it now requires canonical profile verification, with runtime tests enforcing clearing on actual account changes and continuity on same-account refreshes. Build output: `main.f08a312a.js`; this is a local artifact, not a deployed release.
