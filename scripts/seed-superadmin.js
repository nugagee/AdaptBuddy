#!/usr/bin/env node
/**
 * Seeds the default superadmin account.
 *
 * Requires in .env (or environment):
 *   REACT_APP_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (Dashboard → Settings → API → service_role)
 *
 * Usage: node scripts/seed-superadmin.js
 */
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const SUPERADMIN_EMAIL = 'superadmin@adaptbuddy.com';
const SUPERADMIN_PASSWORD = 'Password@1';

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnvFile();

  const url = process.env.REACT_APP_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    console.error(
      'Missing REACT_APP_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
        'Add SUPABASE_SERVICE_ROLE_KEY to .env (never commit this key).',
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Seeding superadmin: ${SUPERADMIN_EMAIL}`);

  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    console.error('Failed to list users:', listError.message);
    process.exit(1);
  }

  const existing = listData.users.find(
    (u) => u.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase(),
  );

  let userId = existing?.id;

  if (existing) {
    console.log('User already exists — updating password and profile role…');
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password: SUPERADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        first_name: 'Super',
        last_name: 'Admin',
        full_name: 'Super Admin',
      },
    });
    if (updateError) {
      console.error('Failed to update user:', updateError.message);
      process.exit(1);
    }
  } else {
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: SUPERADMIN_EMAIL,
      password: SUPERADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        first_name: 'Super',
        last_name: 'Admin',
        full_name: 'Super Admin',
      },
    });
    if (createError) {
      console.error('Failed to create user:', createError.message);
      process.exit(1);
    }
    userId = createData.user.id;
    console.log('Auth user created:', userId);
  }

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: userId,
      email: SUPERADMIN_EMAIL,
      role: 'admin',
      first_name: 'Super',
      last_name: 'Admin',
      full_name: 'Super Admin',
      sex: 'prefer_not_to_say',
      gender: 'prefer_not_to_say',
      is_authorized: true,
      status: 'active',
      email_verified_at: new Date().toISOString(),
      neuro_types: [],
      onboarding_completed: true,
    },
    { onConflict: 'id' },
  );

  if (profileError) {
    console.error('Failed to upsert profile:', profileError.message);
    console.error('Ensure migrations 004–007 have been applied.');
    process.exit(1);
  }

  console.log('Superadmin ready.');
  console.log(`  Email:    ${SUPERADMIN_EMAIL}`);
  console.log(`  Password: ${SUPERADMIN_PASSWORD}`);
  console.log('  Login at: /admin/login');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
