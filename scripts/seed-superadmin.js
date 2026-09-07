#!/usr/bin/env node
/**
 * Seeds or re-verifies a superadmin account through the Supabase service role.
 *
 * Requires in .env (or environment):
 *   REACT_APP_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPERADMIN_EMAIL
 *   SUPERADMIN_PASSWORD  (new accounts only; 16+ characters; never commit or print it)
 *
 * Usage: node scripts/seed-superadmin.js
 */
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

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
  const superadminEmail = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const superadminPassword = process.env.SUPERADMIN_PASSWORD;

  if (!url || !serviceKey || !superadminEmail) {
    console.error(
      'Missing REACT_APP_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or ' +
        'SUPERADMIN_EMAIL. Keep all values out of source control.',
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Seeding or re-verifying superadmin: ${superadminEmail}`);

  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    console.error('Failed to list users:', listError.message);
    process.exit(1);
  }

  const existing = listData.users.find(
    (user) => user.email?.toLowerCase() === superadminEmail,
  );

  let userId = existing?.id;

  if (existing) {
    console.log('Existing auth account found. Its password and sessions were not changed.');
  } else {
    if (!superadminPassword || superadminPassword.length < 16) {
      console.error('A new account requires SUPERADMIN_PASSWORD with at least 16 characters.');
      process.exit(1);
    }

    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: superadminEmail,
      password: superadminPassword,
      email_confirm: true,
      user_metadata: {
        first_name: 'Super',
        last_name: 'Admin',
        full_name: 'Super Admin',
      },
    });
    if (createError) {
      console.error('Failed to create the auth user:', createError.message);
      process.exit(1);
    }
    userId = createData.user.id;
  }

  const verifiedAt = new Date().toISOString();
  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: userId,
      email: superadminEmail,
      role: 'admin',
      first_name: 'Super',
      last_name: 'Admin',
      full_name: 'Super Admin',
      sex: 'prefer_not_to_say',
      gender: 'prefer_not_to_say',
      is_authorized: true,
      status: 'active',
      email_verified_at: verifiedAt,
      admin_verified_at: verifiedAt,
      admin_verified_by: userId,
      admin_verification_method: 'service_role_bootstrap',
      neuro_types: [],
      onboarding_completed: true,
    },
    { onConflict: 'id' },
  );

  if (profileError) {
    console.error('Failed to upsert the verified profile:', profileError.message);
    console.error('Run this only after the reviewed administrator-verification schema is approved and applied.');
    process.exit(1);
  }

  console.log('Superadmin is active and service-role verified.');
  console.log(`Login email: ${superadminEmail}`);
  console.log('The password was not printed. Store and rotate it in your secret manager.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
