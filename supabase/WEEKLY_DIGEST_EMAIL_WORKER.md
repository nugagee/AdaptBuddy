# Weekly Digest Email Worker

AdaptBuddy now has a queued weekly digest pipeline:

1. The app creates rows in `weekly_digest_snapshots`.
2. Snapshots marked `email_ready` are picked up by the Edge Function.
3. The function sends the email through Resend.
4. The row is marked `sent` or `failed`.

## Required Supabase Secrets

Set these in Supabase before deploying the function:

```bash
supabase secrets set DIGEST_WORKER_SECRET="use-a-long-random-secret"
supabase secrets set RESEND_API_KEY="re_xxxxxxxxx"
supabase secrets set DIGEST_FROM_EMAIL="AdaptBuddy <digest@yourdomain.com>"
supabase secrets set DIGEST_REPLY_TO_EMAIL="support@yourdomain.com"
```

Supabase also needs these available to Edge Functions:

```bash
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Those are usually already present in the Supabase function runtime, but you can set them manually if needed.

## Deploy

```bash
supabase functions deploy send-weekly-digests
```

## Test Safely

Dry-run first:

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-weekly-digests" \
  -H "Content-Type: application/json" \
  -H "x-digest-worker-secret: use-a-long-random-secret" \
  -d '{"dryRun":true,"limit":10}'
```

Send due `email_ready` snapshots:

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-weekly-digests" \
  -H "Content-Type: application/json" \
  -H "x-digest-worker-secret: use-a-long-random-secret" \
  -d '{"limit":10}'
```

Send one snapshot by ID:

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-weekly-digests" \
  -H "Content-Type: application/json" \
  -H "x-digest-worker-secret: use-a-long-random-secret" \
  -d '{"snapshotId":"SNAPSHOT_UUID","includeFuture":true}'
```

## Scheduling

Use one of these:

- Supabase scheduled functions, if enabled on the project.
- An external cron service that calls the function every hour.
- A Vercel Cron route later, if we choose to add a server route.

Recommended cadence:

```text
Every hour:
POST /functions/v1/send-weekly-digests
body: {"limit":25}
```

The function only sends snapshots with `status = email_ready` and `scheduled_for <= now()` unless `includeFuture` is explicitly true.

## Safety Notes

- The React app never stores or sees `RESEND_API_KEY`.
- The worker requires `DIGEST_WORKER_SECRET`.
- Sent rows move to `status = sent`.
- Failed sends move to `status = failed` with `email_error` populated.
- The email content is generated from support-visible digest and evidence-pack JSON already stored in Supabase.
