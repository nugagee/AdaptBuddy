# AdaptBuddy and Changers hosting separation — 9 September 2026

> Operational record. AdaptBuddy commits no longer trigger the Changers Vercel project. Changers remains disconnected from Git until its existing Vercel project is explicitly connected to `Watchman77/changers-web` after GitHub App access is available.

## Cause and completed change

Vercel project `changers-web` was incorrectly connected to `Watchman77/Adaptbuddy-Platform` and tracked production branch `upload/adaptbuddy-web`. AdaptBuddy commits therefore triggered builds for both projects, and Changers failures appeared in AdaptBuddy's aggregate GitHub status.

Only the Changers Git connection was removed through Vercel's **Remove Git Connection** action. Project settings and configuration were preserved. No deployment, domain, environment variable, account, database or repository history was removed. No plan upgrade was made.

## Verified boundaries

| Boundary | AdaptBuddy | Changers |
| --- | --- | --- |
| Vercel project | `adaptbuddy-platform` | `changers-web` |
| Repository | `Watchman77/Adaptbuddy-Platform` | Intended: `Watchman77/changers-web` |
| Production branch | `upload/adaptbuddy-web` | Intended: `main` |
| Public domains | `www.adaptbuddy.co.uk`, `www.adaptbuddy.com` | `www.changersltd.com` |
| Supabase project used by the public client | `fmlxtlicawkgiemubyid` | `yybohmmisxrfshmcvjvx` |
| Shared production variables | None linked | None linked |
| Deploy hooks at verification time | None | None |

Both projects remain under the Vercel Hobby team `watchman77s-projects`. This separates deployment sources and application configuration; it does not create separate account ownership or quotas. The distinct Supabase project identifiers were confirmed from the public client bundles and are not secret credentials.

## Verification

Both AdaptBuddy domains and the Changers domain returned successful HTTP responses with their expected site titles and assets after the disconnect. AdaptBuddy content hashes matched the previously verified live release.

The Changers production source resolved in `Watchman77/changers-web` and was an ancestor of that repository's `main` at verification time. Historical failed checks on earlier AdaptBuddy commits remain visible because disconnecting a project does not rewrite old GitHub statuses.

## Remaining Changers step

When GitHub App repository access is available:

1. Grant Vercel access only to the required repositories, including `Watchman77/changers-web`.
2. Connect the existing Vercel `changers-web` project to that repository.
3. Set its production branch to `main` and retain its existing Vite settings, domains and project-specific environment variables.
4. Read back both Vercel project connections and confirm that each live site still serves its expected application.

This reconnection belongs to the Changers project. AdaptBuddy's repository, deployment source and Supabase configuration must remain unchanged while it is performed.
