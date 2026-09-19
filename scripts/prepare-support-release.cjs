// Produces a private SQL artifact only. Does not connect, deploy, or change a plan.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const [planPath, outputPath] = process.argv.slice(2);
assert.ok(planPath && outputPath, 'Usage: node scripts/prepare-support-release.cjs <private-plan.json> <private-output.sql>');
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
assert.equal(plan.projectRef, 'fmlxtlicawkgiemubyid', 'Use the confirmed AdaptBuddy project');
assert.equal(plan.adminPasswordRotated, true, 'The owner must confirm password rotation first');
assert.equal(plan.adminIdentityConfirmedByOwner, true, 'The owner must identify the legitimate administrator');
assert.match(plan.adminEmail || '', /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
const root = path.resolve(__dirname, '..');
const body = file => fs.readFileSync(path.join(root, file), 'utf8')
  .replace(/^begin;\s*$/m, '').replace(/^commit;\s*$/m, '');
const sql = `-- Generated release for confirmed project fmlxtlicawkgiemubyid.
-- Contains an owner-confirmed email. Keep private and do not commit.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
lock table auth.users, public.profiles in access exclusive mode;
do $$declare v_id uuid; v_count integer; begin
  select count(*),min(p.id::text)::uuid into v_count,v_id
  from public.profiles p join auth.users u on u.id=p.id
  where lower(u.email)=${quote(plan.adminEmail.toLowerCase().trim())}
    and p.role::text='admin' and p.is_authorized is true and p.status='active'
    and u.email_confirmed_at is not null and u.deleted_at is null
    and (u.banned_until is null or u.banned_until<=now());
  if v_count<>1 then raise exception 'The confirmed active administrator was not found. No changes applied.'; end if;
  perform set_config('adaptbuddy.release_admin_id',v_id::text,true);
end$$;
${body('supabase/migration-drafts/041_profile_authority_boundary.sql')}
update public.profiles set admin_verified_at=coalesce(admin_verified_at,now()),
  admin_verified_by=id,admin_verification_method='service_role_bootstrap'
where id=current_setting('adaptbuddy.release_admin_id')::uuid;
${body('supabase/migration-drafts/044_scoped_support_connections.sql')}
do $$begin
  if not exists(select 1 from public.profiles where id=current_setting('adaptbuddy.release_admin_id')::uuid
    and role::text='admin' and admin_verified_at is not null and admin_verified_by=id
    and admin_verification_method='service_role_bootstrap') then
    raise exception 'Administrator recovery verification failed.';
  end if;
end$$;
notify pgrst,'reload schema';
commit;
`;
fs.writeFileSync(outputPath, sql, { mode: 0o600, flag: 'wx' });
console.log('Prepared one atomic authority and scoped-support SQL release. No connection or deployment was made.');
