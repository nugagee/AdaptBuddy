# AdaptBuddy Admin Console

Platform analytics and user management for administrators.

## Setup (one-time)

### 1. Run database migrations (two steps)

PostgreSQL requires the `admin` enum value to be **committed** before it can be used. Run these **separately** in **Supabase Dashboard → SQL Editor**:

**Step A** — paste and run only:

```
supabase/migrations/004_admin_role_enum.sql
```

Wait for success.

**Step B** — open a **new query**, paste and run:

```
supabase/migrations/005_admin_platform.sql
```

This adds profile fields (`gender`, `is_authorized`, `status`), admin RLS policies, and privileged RPC functions.

> If you see `unsafe use of new value "admin"`, you ran both steps in one query. Run Step A alone first.

**Step C** (optional but recommended) — run in a **new query**:

```
supabase/migrations/007_sex_and_gender_split.sql
```

This separates **sex** (UK ONS / NHS biological/legal) and **gender identity** (UK NHS) into distinct `profiles.sex` and `profiles.gender` columns, migrates existing data, and updates admin analytics + `admin_create_user`.

### 2. Seed the superadmin account

Add your **service role key** to `.env` (never commit this key):

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Then run:

```bash
node scripts/seed-superadmin.js
```

Default credentials:

| Field | Value |
|-------|--------|
| Email | `superadmin@adaptbuddy.com` |
| Password | `Password@1` |

### 3. Sign in

Open **`/admin/login`** in the app.

## Features

### Overview (`/admin`)
- Total users, role breakdown (child / parent / teacher / admin)
- Sex and gender identity distribution charts (UK standard)
- Authorized vs unauthorized accounts
- Recent signups (7 / 30 days)
- Average age, onboarding stats
- Account status breakdown

### Users (`/admin/users`)
- Search and filter by role
- **Create** users (any role, including admin)
- **Edit** profile, role, sex, gender identity, age, status, authorization
- **Authorize / revoke** access
- **Reset password** (admin RPC)
- **Delete** users (cannot delete yourself)

## Creating more admins

1. Sign in as superadmin
2. Go to **Users → Create user**
3. Set **Role** to `admin`
4. Save

Or update an existing user’s role to `admin` via **Edit**.

## Security notes

- Admin role is **not** available on public signup
- All admin actions require `profiles.role = 'admin'` (enforced by RLS + RPCs)
- `SUPABASE_SERVICE_ROLE_KEY` is only for the seed script — never expose in frontend code
- Change the default superadmin password after first login in production
