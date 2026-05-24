# Supabase email templates (OTP)

Supabase sends a **magic link** by default. To send a **6-digit OTP** instead, the template must include `{{ .Token }}` and must **not** include `{{ .ConfirmationURL }}`.

AdaptBuddy signup uses `signInWithOtp`, which sends the **Magic Link** template.

## Required setup (one-time)

1. Open your project: **Authentication → Email Templates**
2. Select **Magic Link**
3. Set **Subject** to something like: `Your AdaptBuddy verification code`
4. Replace the body with the contents of `magic-link-otp.html` in this folder
5. **Save**

### Important

- Remove any `{{ .ConfirmationURL }}` or “Confirm your mail” link from the template — that forces a link email with no code.
- Only `{{ .Token }}` triggers the 6-digit OTP email.

### Optional (legacy signUp emails)

If you still see “Confirm your signup” emails from older tests, also update **Confirm signup** using `confirm-signup-otp.html`.

## Test

1. Sign up in the app
2. You should receive an email with a 6-digit code (not a link)
3. Enter the code in the OTP modal

## Rate limits

Default: one OTP per 60 seconds. Configure under **Authentication → Providers → Email → Email OTP Expiration**.
