# Supabase email templates (OTP)

AdaptBuddy uses **three separate** Supabase email templates. Each must use `{{ .Token }}` only — never `{{ .ConfirmationURL }}`.

| App flow | Supabase template | File to paste |
|----------|-------------------|---------------|
| New signup | **Confirm signup** | `confirm-signup-otp.html` |
| Signup resend / returning email | **Magic Link** | `magic-link-otp.html` |
| Forgot password | **Reset password** | `reset-password-otp.html` |

## Required setup

Open **Supabase Dashboard → Authentication → Email Templates** for each row below.

### 1. Confirm signup (new signups)

1. Open **Confirm signup**
2. **Subject:** `Your AdaptBuddy verification code`
3. **Body:** paste all of `confirm-signup-otp.html`
4. **Remove** any `{{ .ConfirmationURL }}`, buttons, or “confirm email” links
5. **Save**

### 2. Magic Link (signup resend for existing emails)

1. Open **Magic Link**
2. **Subject:** `Your AdaptBuddy verification code`
3. **Body:** paste all of `magic-link-otp.html`
4. **Remove** any `{{ .ConfirmationURL }}` or sign-in links
5. **Save**

### 3. Reset password (forgot password) — required

Forgot password calls `resetPasswordForEmail`. **Only this template** is used for password reset — not Confirm signup or Magic Link.

1. Open **Reset password**
2. **Subject:** `Your AdaptBuddy password reset code`
3. **Body:** paste all of `reset-password-otp.html`:

```html
<h2>Reset your AdaptBuddy password</h2>

<p>Enter this 6-digit code in the app to verify your email before choosing a new password:</p>

<p style="font-size: 28px; font-weight: bold; letter-spacing: 6px; margin: 24px 0;">
  {{ .Token }}
</p>

<p>This code expires in 1 hour and can only be used once.</p>

<p>If you did not request a password reset, you can safely ignore this email.</p>
```

4. **Delete** the default body entirely — including “Follow the link below”, “Reset password” buttons, and `{{ .ConfirmationURL }}`
5. **Save**

## Troubleshooting

| Email you receive | Cause | Fix |
|-------------------|-------|-----|
| Link + “Follow the link below to choose a new one” | **Reset password** still has default link template | Step 3 above |
| “Finish signing up” / signup wording on forgot password | Wrong template (Magic Link or Confirm signup) — app was misconfigured or template not updated | Step 3 above; redeploy app |
| No code, only a button | Template still has `{{ .ConfirmationURL }}` | Replace body with `{{ .Token }}` only |

## Rules

| Do | Don't |
|----|--------|
| Include `{{ .Token }}` in the template body | Include `{{ .ConfirmationURL }}` |
| Use plain text code display | Use “Confirm email” / “Reset password” link buttons |

Only `{{ .Token }}` makes Supabase send a **6-digit OTP**.

Reference: [Supabase passwordless email docs](https://supabase.com/docs/guides/auth/auth-email-passwordless) · [Email templates](https://supabase.com/docs/guides/auth/auth-email-templates)

## Authentication settings

**Authentication → Providers → Email**

- Ensure **Email** provider is enabled
- Set **Site URL:** `https://adaptbuddy-platform.vercel.app` (or your domain)
- **Redirect URLs:** `https://adaptbuddy-platform.vercel.app/**`

## Test

**Signup:** new email → Confirm signup template → 6-digit code in app.

**Forgot password:** existing account → **Reset password** template → subject “password reset code” → 6-digit code → set new password in app.

## Rate limits

Default: one OTP per 60 seconds. Configure under **Authentication → Providers → Email**.
