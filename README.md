# 🧠 AdaptBuddy - Neuro-Inclusive Learning Platform

> AI-powered personalized education with real-time emotional wellbeing support for neurodiverse learners.

[![React](https://img.shields.io/badge/React-18.2-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.3-blue)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)

## Mission
To empower neurodivergent children (Autism, ADHD, Dyslexia, Dyspraxia, etc.) through personalized learning tools and real-time emotional safeguarding in a safe, accessible digital environment.

## Features
- **Neuro-Profile Selection** - Multi-condition support (8+ neurotypes)
- **Adaptive Dashboard** - Personalized learning paths based on profile
- **Feelings Journal** - AI-powered emotional check-ins with safeguarding alerts
- **Parent Hub** - Real-time progress tracking & wellbeing monitoring
- **Accessibility First** - Dyslexia fonts, color overlays, text-to-speech, focus tools
- **Mobile-Optimized** - Responsive design for tablets & phones

## Supabase setup (auth + profiles)

1. Create a project at [supabase.com](https://supabase.com) and copy the URL + anon key into `.env.local` (see `.env.example`).

2. Run the migration in **SQL Editor** (or Supabase CLI):

   `supabase/migrations/001_create_profiles.sql`

   This creates the `profiles` table with role, first/last name, child name (parents), and RLS policies.

3. **Configure the email template for OTP** (required — default sends a link, not a code):

   - **Authentication → Email Templates → Magic Link**
   - Set subject to e.g. `Your AdaptBuddy verification code`
   - Replace the body with `supabase/email-templates/magic-link-otp.html`
   - **Remove** any `{{ .ConfirmationURL }}` or “Confirm your mail” link — only `{{ .Token }}` sends the 6-digit code
   - See `supabase/email-templates/README.md` for full steps

4. Optional: **Authentication → Providers → Email** — you can turn **Confirm email** off; OTP verification in the app replaces it.

5. **Custom SMTP (production):** To send more than the built-in ~2 emails/hour, connect your own mail server in **Authentication → Emails → SMTP Settings**. See `supabase/SMTP_SETUP.md` (e.g. `mail.nugagee.com.ng`, port `465`).

6. After signup, users enter the code in the OTP modal; verified accounts are saved to `profiles` and routed by role.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS (Create React App)
- **Auth**: Supabase (user management)
- **Data**: Firebase Firestore (planned — see `src/services/firebase`)
- **UI**: Lucide React Icons
- **State**: Zustand (auth, theme, accessibility preferences)

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
│   ├── firebase/     # Firestore config (data layer)
│   └── ai/           # Emotion & recommendation engines
├── store/            # Zustand stores (authStore, uiStore)
├── hooks/            # useAuth, useTheme, useAccessibility
├── components/       # Shared UI (accessibility, animations)
├── constants/        # Route paths
├── types/
├── hooks/
└── assets/
```
