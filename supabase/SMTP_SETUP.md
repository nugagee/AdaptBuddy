# Custom SMTP for AdaptBuddy (Supabase Auth)

Supabase’s **built-in** mailer is limited on the free plan (roughly **2 emails/hour** to non-team addresses).  
Connect your own SMTP so OTP signup emails use **your hosting mailbox** instead.

Official guide: [Send emails with custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

---

## Your hosting (Nugagee mail)

| Setting | Value |
|--------|--------|
| **SMTP host** | `mail.nugagee.com.ng` |
| **SMTP port** | `465` (SSL/TLS) |
| **Username** | `contact@nugagee.com.ng` |
| **Password** | Your mailbox password (same as webmail login) |
| **Sender email** | `contact@nugagee.com.ng` *(must match username)* |
| **Sender name** | `AdaptBuddy` (or any display name) |

> **Important:** `Sender email` and `Username` must be the **same address**, or many servers reject the message.

If port **465** fails in Supabase’s test, try port **587** (STARTTLS) on the same host.

---

## Step-by-step in Supabase Dashboard

1. Open your project: [supabase.com/dashboard](https://supabase.com/dashboard)
2. Go to **Authentication** → **Emails**
3. Open the **SMTP Settings** tab
4. Turn **Enable Custom SMTP** **ON**
5. Fill in:

   | Supabase field | Value |
   |----------------|--------|
   | Sender email | `contact@nugagee.com.ng` |
   | Sender name | `AdaptBuddy` |
   | Host | `mail.nugagee.com.ng` |
   | Port | `465` |
   | Username | `contact@nugagee.com.ng` |
   | Password | *(mailbox password — not stored in this repo)* |

6. Click **Save**. Supabase will verify the connection; fix host/port/password if it errors.

---

## Raise auth email rate limits

After custom SMTP is enabled, Supabase still applies **default auth rate limits** (e.g. ~30 messages/hour until you change them).

1. **Authentication** → **Rate Limits**
2. Increase **Email sent** / **OTP** limits to match your hosting allowance
3. Save

Your host may also cap sends per hour/day — check with your provider (cPanel / mail admin).

---

## Keep OTP templates (still required)

Custom SMTP only changes **who sends** the email. Templates must still use **`{{ .Token }}`** (not a confirmation link).

Update both in **Authentication → Email Templates**:

- **Confirm signup** → `supabase/email-templates/confirm-signup-otp.html`
- **Magic Link** → `supabase/email-templates/magic-link-otp.html`

See `supabase/email-templates/README.md`.

---

## Deliverability (recommended)

So OTP emails don’t land in spam:

1. In your domain DNS (`nugagee.com.ng`), add **SPF** if missing, e.g.  
   `v=spf1 a mx ip4:YOUR_SERVER_IP ~all`
2. Enable **DKIM** in cPanel / mail admin if available
3. Send a test signup to Gmail and Yahoo and confirm inbox delivery

---

## Test

1. Save SMTP settings
2. Sign up on production with a **new** test email
3. You should receive a **6-digit code** from `contact@nugagee.com.ng`
4. Enter the code in the AdaptBuddy OTP modal

---

## Troubleshooting

| Symptom | What to try |
|--------|-------------|
| “Failed to connect” on save | Port 587 instead of 465; confirm host `mail.nugagee.com.ng` |
| Auth error / invalid credentials | Re-enter mailbox password; no extra spaces |
| Emails not arriving | Check spam; SPF/DKIM; hosting send limits |
| Still only 2/hour | Confirm **Custom SMTP** is ON and rate limits were increased |
| Link instead of code | Fix **Confirm signup** template — use `{{ .Token }}` only |

No app code changes are required for SMTP; this is entirely **Supabase Dashboard + DNS** configuration.
