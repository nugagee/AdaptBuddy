# 🧠 AdaptBuddy - Neuro-Inclusive Learning Platform

> Child-first learning, communication and trusted-adult support for neurodivergent learners.

[![React](https://img.shields.io/badge/React-18.3-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9-blue)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.3-blue)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)

## Mission
To empower neurodivergent children through personalised, accessible learning tools, communication support and carefully bounded trusted-adult pathways.

## Features
- **Neuro-Profile Selection** - Multi-condition support across a growing set of neuro-inclusive profiles
- **Adaptive Dashboard** - Personalised learning paths based on selected support profiles
- **Feelings Journal** - Private emotional check-ins with safeguarded in-app support pathways under development
- **Parent Hub** - Progress and wellbeing coordination for authorised family support
- **Accessibility First** - Dyslexia fonts, colour overlays, text-to-speech, focus tools and reduced-motion support
- **Mobile-Optimized** - Responsive design for tablets and phones, with broader mobile accessibility QA still in progress
- **AI Buddy** - Server-mediated, age-aware support with explicit AI identity and bounded trusted-adult guidance

## Safeguarding status

AdaptBuddy is not an emergency service and does not currently promise real-time external adult notification. Worry Diary safeguarding remains a pre-pilot workstream. Private journal text must not be exposed to adults unless the child explicitly shares it or a separately approved, minimal and auditable safeguarding rule requires disclosure. Adults remain responsible for safeguarding decisions and follow-up.

See `docs/WORRY_DIARY_SAFEGUARDING_STATUS.md` for the current release boundary and remaining work.

## Launch safety requirements

- Keep the repository private and never commit `.env` or `.env.local`.
- Configure `OPENAI_API_KEY` and optional `OPENAI_MODEL` as server-only Vercel environment variables. Never use a `REACT_APP_` prefix for an OpenAI key.
- Apply Supabase migrations in numeric order through `040_child_privacy_boundaries.sql`, then follow only separately reviewed release instructions for later scoped database changes.
- Verify Row Level Security with separate child, parent and teacher pilot accounts before using real personal data.
- Treat AI as a support interface only. Adults remain responsible for safeguarding decisions and follow-up.
- Run `npm run test:buddy-safety`, `npm test -- --watchAll=false`, and `npm run build` before deployment.

## Supabase setup (auth + profiles)

1. Create a project at [supabase.com](https://supabase.com) and copy the URL + anon key into `.env.local` (see `.env.example`).

2. Run the migrations in **SQL Editor** (or Supabase CLI):

   Apply migrations in `supabase/migrations/` in numeric order, finishing with
   `040_child_privacy_boundaries.sql`. Later safeguarding/access changes must follow their reviewed release records rather than being applied from broad draft files.

3. **Configure the email template for OTP** (required — default sends a link, not a code):

   - **Authentication → Email Templates → Magic Link**
   - Set subject to e.g. `Your AdaptBuddy verification code`
   - Replace the body with `supabase/email-templates/magic-link-otp.html`
   - **Remove** any `{{ .ConfirmationURL }}` or “Confirm your mail” link — only `{{ .Token }}` sends the 6-digit code
   - See `supabase/email-templates/README.md` for full steps

4. Optional: **Authentication → Providers → Email** — you can turn **Confirm email** off; OTP verification in the app replaces it.

5. **Custom SMTP (production):** connect a production mail service only after the relevant workflow has been reviewed and approved. See `supabase/SMTP_SETUP.md` for configuration guidance.

6. After signup, users enter the code in the OTP modal; verified accounts are saved to `profiles` and routed by role.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS (Create React App)
- **Auth**: Supabase
- **Data**: Supabase with Row Level Security
- **AI**: OpenAI through server-only API endpoints
- **UI**: Lucide React Icons
- **State**: Zustand

## Project Structure

```text
src/
├── app/              # App providers
├── routes/           # Route definitions
├── layouts/          # MainLayout, AuthenticatedLayout
├── features/
│   ├── auth/         # Login, AuthContext, ProtectedRoute
│   ├── child/        # Dashboard, journal, neuro-selector
│   ├── parent/       # Parent hub
│   ├── teacher/      # School / teacher portal
│   ├── ai/           # Emotion analysis UI
│   └── analytics/    # Charts & insights
├── services/
│   ├── supabase/     # Auth & profiles
│   ├── firebase/     # Optional/legacy service integration
│   └── ai/           # AI support services
├── store/            # Zustand stores
├── hooks/            # Shared hooks
├── components/       # Shared UI and accessibility components
├── constants/        # Routes and profile definitions
├── types/
└── assets/
```
