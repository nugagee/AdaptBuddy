// Rehearses generated release SQL against synthetic accounts in the named local stack only.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const dir = process.env.ADAPT_BUDDY_LOCAL_REHEARSAL;
assert.ok(dir);
assert.match(fs.readFileSync(path.join(dir, 'supabase/config.toml'), 'utf8'), /^project_id = "adaptbuddy-local-rehearsal"$/m);
assert.match(process.env.DOCKER_HOST || '', /^unix:\/\/.*\/adaptbuddy-rehearsal\/docker\.sock$/);
const sql = input => execFileSync('docker', ['exec', '-i', 'supabase_db_adaptbuddy-local-rehearsal', 'psql', '-X', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
const adminEmail = sql("select email from profiles where role='admin' and admin_verified_at is not null and email like 'rehearsal-support-fake-admin-%@example.invalid';");
assert.match(adminEmail, /^rehearsal-support-fake-admin-[a-f0-9-]+@example.invalid$/);
const planPath = path.join(dir, 'synthetic-release-plan.json');
const outputPath = path.join(dir, 'synthetic-generated-release.sql');
const prepare = plan => {
  fs.writeFileSync(planPath, JSON.stringify(plan), { mode: 0o600 });
  fs.rmSync(outputPath, { force: true });
  return execFileSync(process.execPath, [path.join(__dirname, 'prepare-support-release.cjs'), planPath, outputPath], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
};
const plan = { projectRef: 'fmlxtlicawkgiemubyid', adminEmail, adminIdentityConfirmedByOwner: true, adminPasswordRotated: true };
// These assertions concern synthetic test fixtures, never live owner confirmation.
assert.throws(() => prepare({ ...plan, adminPasswordRotated: false }));
assert.throws(() => prepare({ ...plan, adminIdentityConfirmedByOwner: false }));
assert.throws(() => prepare({ ...plan, projectRef: 'wrong-project' }));
const counts = () => sql('select (select count(*) from profiles),(select count(*) from trusted_support_contacts),(select count(*) from trusted_support_requests);');
const before = counts();
prepare({ ...plan, adminEmail: 'missing-admin@example.invalid' });
assert.throws(() => sql(fs.readFileSync(outputPath, 'utf8')));
assert.equal(counts(), before);
prepare(plan);
sql(fs.readFileSync(outputPath, 'utf8'));
assert.equal(counts(), before);
assert.equal(sql("select count(*) from profiles where role='admin' and admin_verified_at is not null and admin_verified_by=id and admin_verification_method='service_role_bootstrap';"), '1');
console.log('PASS release preparation rejects unconfirmed identity, unrotated password, and wrong project');
console.log('PASS missing administrator aborts atomically; valid synthetic administrator and all record counts survive release');
