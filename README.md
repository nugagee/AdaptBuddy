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
