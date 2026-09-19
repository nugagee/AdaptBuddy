const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function mustMatch(source, pattern, message) {
  assert.match(source, pattern, message);
}

function mustNotMatch(source, pattern, message) {
  assert.doesNotMatch(source, pattern, message);
}

const store = read('src/features/child/store/trustedAdultStore.ts');
const settings = read('src/features/child/pages/SettingsPage.tsx');
const connections = read('src/components/support/SupportConnectionsPanel.tsx');
const requestAction = read('src/components/support/SupportRequestAction.tsx');
const scopedSql = read('supabase/migration-drafts/044_scoped_support_connections.sql');
const trustedAdultService = read('src/services/supabase/autismProfileService.ts');
const parentService = read('src/features/parent/services/parentDashboardService.ts');
const parentHub = read('src/features/parent/pages/ParentHubPage.tsx');
const teacherService = read('src/features/teacher/services/teacherDashboardService.ts');
const moodPanel = read('src/features/child/components/companion/MoodCheckInPanel.tsx');
const conversationPanel = read('src/features/child/components/companion/BuddyConversationPanel.tsx');
const buddyApi = read('api/buddy.js');
const migration = read('supabase/migration-drafts/041_safeguarding_access_guardrails.draft.sql');
const seedAdmin = read('scripts/seed-superadmin.js');
const adminSetup = read('supabase/ADMIN_SETUP.md');
const authStore = read('src/store/authStore.ts');
const guestEntry = read('src/pages/GuestEntryPage.tsx');
const protectedRoute = read('src/features/auth/components/ProtectedRoute.tsx');
const loginPage = read('src/pages/LoginPage.tsx');
const heroSection = read('src/pages/LandingPage/components/HeroSection.tsx');
const packageJson = JSON.parse(read('package.json'));

mustNotMatch(
  store,
  /const\s+defaultTrustedAdults\b/,
  'The store must not seed fictional trusted adults.',
);
mustMatch(store, /trustedAdults:\s*\[\]/, 'A new trusted-adult store must start empty.');
mustMatch(store, /selectedTrustedAdultId:\s*null/, 'A new store must have no selected adult.');
mustMatch(store, /ownerChildId:\s*string \| null/, 'Trusted-adult state must be scoped to a child.');
mustMatch(store, /clearTrustedAdults/, 'Trusted-adult state must have an explicit account-transition clear action.');
mustNotMatch(store, /zustand\/middleware|\bpersist\s*\(/, 'Trusted-adult contacts must not be persisted browser-wide.');
mustMatch(store, /localStorage\.removeItem\('adaptbuddy-trusted-adults'\)/, 'Legacy cached contacts must be removed.');
mustMatch(store, /isConnectedTrustedAdult/, 'Selection must use a connected-status guard.');
mustMatch(
  store,
  /if\s*\(!adult\s*\|\|\s*!isConnectedTrustedAdult\(adult\)\)\s*return/,
  'Pending adults must not be selectable.',
);

mustMatch(settings, /SupportConnectionsPanel/, 'Settings must expose the scoped connection manager.');
mustMatch(connections, /TRUSTED_ADULT_INVITATIONS_ENABLED/, 'Connection UI must respect release readiness.');
mustMatch(connections, /Accept invitation/, 'An authenticated adult needs an acceptance action.');
mustMatch(connections, /Decline invitation/, 'An authenticated adult needs a decline action.');
mustMatch(connections, /End support connection/, 'Each participant must be able to end access.');
mustMatch(connections, /No email or text alert is sent/, 'In-app invitations must not imply external delivery.');
mustMatch(connections, /if \(!user\?\.id \|\| isGuest\)/, 'Guests must not manage real connections.');
mustNotMatch(scopedSql, /insert into public\.(?:trusted_adults|child_relationships|journal_entries|alerts|parent_child_signals)\b/i, 'Scoped acceptance/requests must not grant or populate legacy access.');
mustMatch(scopedSql, /r\.contact_id is distinct from p_contact_id/, 'Idempotency must bind the explicit recipient.');
mustMatch(scopedSql, /c\.adult_id=v_uid/, 'Inbox reads must be restricted to the actual recipient.');

mustMatch(trustedAdultService, /row\.accepted_at[\s\S]*row\.accepted_by === row\.adult_id[\s\S]*row\.acceptance_method === 'account_email'[\s\S]*:\s*'pending'/, 'Client status must require complete acceptance evidence.');
mustMatch(trustedAdultService, /list_trusted_support_contacts_v1/, 'Trusted-adult reads must use the scoped authenticated contract.');
mustMatch(parentService, /Direct Buddy ID linking is temporarily disabled/, 'The client must not call the unsafe generic Buddy ID link flow.');
mustNotMatch(parentService, /rpc\('link_child_by_buddy_id'/, 'The client must not invoke generic Buddy ID self-linking.');
mustMatch(parentService, /adultUserId:\s*row\.adult_id/, 'Invitation IDs and accepted adult account IDs must remain distinct.');
mustMatch(parentService, /row\.accepted_at[\s\S]*row\.accepted_by === row\.adult_id[\s\S]*row\.acceptance_method === 'account_email'[\s\S]*:\s*'pending'/, 'Parent views must require complete acceptance evidence.');
mustMatch(parentService, /status, accepted_at, accepted_by, acceptance_method/, 'Parent trusted-adult reads must request complete acceptance evidence.');
mustNotMatch(parentService, /rpc\(\s*'parent_teacher_class_requests'/, 'The unverified legacy class-request audit fallback must remain disabled.');
mustMatch(parentService, /Verified class approval audit is unavailable/, 'Class-request audit must fail closed when the verified RPC is absent.');

for (const [name, source] of [
  ['parent service', parentService],
  ['parent hub', parentHub],
  ['teacher service', teacherService],
]) {
  mustMatch(source, /neuroProfile:\s*false[\s\S]*dailyMood:\s*'hidden'[\s\S]*safeguardingAlerts:\s*false[\s\S]*academicTasks:\s*false/, `${name} visibility defaults must be private.`);
}
mustNotMatch(teacherService, /raw\.(?:neuroProfile|safeguardingAlerts|academicTasks)\s*!==\s*false/, 'Missing teacher visibility values must never grant access.');
mustMatch(teacherService, /\.filter\(\(membership\) => membership\.status === 'active'\)/, 'Only active memberships may populate the teacher student roster.');
mustMatch(teacherService, /buddyId:\s*null,[\s\S]*age:\s*undefined/, 'Teacher rosters must not expose Buddy IDs or age without an explicit visibility grant.');

for (const source of [moodPanel, conversationPanel]) {
  mustMatch(source, /SupportRequestAction/, 'Support surfaces must use the recipient-aware action.');
}
mustMatch(requestAction, /Record support request/, 'The action must describe recording.');
mustMatch(requestAction, /Only me — private record/, 'Private recording must be an explicit option.');
mustMatch(requestAction, /recipient \|\| null/, 'The chosen recipient must reach the shared service boundary.');
mustMatch(requestAction, /does not confirm they have seen it/, 'Recorded requests must not imply adult acknowledgement.');
mustMatch(requestAction, /no guaranteed response time/, 'Unstaffed recording must not promise a response.');

mustMatch(buddyApi, /No email or text alert has been sent by AdaptBuddy/g, 'Buddy safety copy must give honest direct-contact guidance.');
mustNotMatch(buddyApi, /support button records/, 'Buddy must not advertise unavailable recording.');
mustNotMatch(buddyApi, /use the button below|use a quick support button/i, 'Buddy API safety copy must not imply external contact through the support button.');
mustNotMatch(parentService, /send a trusted-adult invitation/i, 'The parent flow must not claim an invitation was sent.');

mustMatch(migration, /add column if not exists accepted_at/, 'Trusted-adult acceptance evidence is required.');
mustMatch(migration, /accepted_by\s*=\s*adult_id/, 'Connected status must be bound to the accepting account.');
mustMatch(migration, /acceptance_method\s*=\s*'account_email'/, 'Acceptance method must be recorded.');
mustMatch(migration, /guardian_verified_at/, 'Guardian verification must be separate from email acceptance.');
mustMatch(migration, /create or replace function public\.accept_trusted_adult_invitation/, 'An explicit acceptance RPC is required.');
mustMatch(
  migration,
  /accept_trusted_adult_invitation[\s\S]*insert into public\.child_relationships[\s\S]*on conflict \(parent_id, child_id\)/,
  'Confirmed acceptance must recreate the parent-dashboard access edge atomically.',
);
mustMatch(migration, /status\s*=\s*'pending'[\s\S]*accepted_at\s*=\s*null/, 'New or legacy unverified adults must remain pending.');
mustMatch(migration, /safeguarding_link_quarantine/, 'Legacy automatic relationships must be recoverably quarantined.');
mustMatch(migration, /create or replace function public\.enforce_child_relationship_acceptance/, 'Every relationship write must require acceptance evidence.');
mustMatch(migration, /create unique index if not exists trusted_adults_child_email_unique_idx/, 'Duplicate child invitations must be prevented.');
mustMatch(migration, /drop trigger if exists profiles_sync_trusted_adult_links/, 'Email signup must not auto-connect an adult.');
mustNotMatch(migration, /create trigger profiles_sync_trusted_adult_links/, 'The unsafe email auto-link trigger must stay disabled.');
mustMatch(migration, /Direct Buddy ID linking is disabled/, 'Generic Buddy ID self-linking must fail closed.');
mustMatch(migration, /drop policy if exists "Children can manage own trusted adults"/, 'Children must not directly write trusted-adult authorisation fields.');
mustMatch(migration, /revoke all on table public\.trusted_adults from public, anon, authenticated/, 'Trusted-adult privileges must fail closed.');
mustMatch(migration, /grant select on table public\.trusted_adults to authenticated/, 'Authenticated reads must still pass through RLS.');

for (const policy of [
  'Class request creators can insert requests',
  'Class teachers can update join requests',
  'Linked parents can update class join requests',
  'Class teachers can create memberships',
  'Class teachers can update memberships',
]) {
  mustMatch(
    migration,
    new RegExp(`drop policy if exists "${policy}"`),
    `${policy} must be removed.`,
  );
}

mustMatch(migration, /revoke all on table public\.class_join_requests from public, anon, authenticated/, 'Class approval privileges must fail closed.');
mustMatch(migration, /revoke all on table public\.class_memberships from public, anon, authenticated/, 'Class membership privileges must fail closed.');
mustMatch(migration, /enforce_class_join_request_approval/, 'Join requests need database approval enforcement.');
mustMatch(migration, /enforce_class_membership_approval/, 'Active memberships need database approval enforcement.');
mustMatch(migration, /parent_profile\.role::text\s*=\s*'parent'/, 'A parent-role account must supply class approval.');
mustMatch(migration, /lock table[\s\S]*public\.profiles[\s\S]*in access exclusive mode/, 'Safeguarding cleanup must prevent concurrent legacy writes.');
mustMatch(migration, /safeguarding_state_quarantine/, 'Changed legacy approvals and memberships need recoverable snapshots.');
mustMatch(migration, /delete from public\.child_relationships relationship[\s\S]*where not exists[\s\S]*accepted_adult\.acceptance_method = 'account_email'/, 'Every relationship without acceptance provenance must be quarantined and removed.');
mustMatch(migration, /revoke all on table public\.child_relationships from public, anon, authenticated/, 'Legacy relationship writes must be disabled.');
mustMatch(migration, /status = 'pending'\s+and adult_id is null/, 'Pending invitations must not pre-bind an account.');
mustMatch(migration, /from auth\.users[\s\S]*email_confirmed_at/, 'Acceptance must use the confirmed Auth identity.');
mustMatch(migration, /lower\(guardian\.role\) in \('parent', 'guardian', 'grandparent', 'carer'\)/, 'Guardian evidence must use an allowed role.');
mustMatch(migration, /Parent and teacher approval must come from different accounts/, 'Two-person class approval must use distinct accounts.');
mustMatch(migration, /cjr\.visibility_settings = new\.visibility_settings/, 'Membership visibility must match the approved request.');
mustMatch(migration, /Active membership identity fields cannot be changed/, 'Active membership identities must be immutable.');
mustMatch(migration, /create or replace function public\.revoke_trusted_adult_for_child/, 'A child-owned revocation path is required.');
mustMatch(migration, /create or replace function public\.protect_profile_security_fields/, 'Profile authority fields need database protection.');
mustMatch(migration, /auth\.jwt\(\)->>'role'[\s\S]*service_role/, 'Privileged profile changes must identify the service role explicitly.');
mustMatch(migration, /new\.email is distinct from old\.email/, 'A user must not impersonate an invitation email.');
mustMatch(migration, /new\.role is distinct from old\.role/, 'A user must not promote their own role.');
mustMatch(migration, /requested_role[\s\S]*when 'child'[\s\S]*when 'teacher'[\s\S]*else 'parent'/, 'Signup metadata must never create an admin.');
mustMatch(migration, /admin_verification_method\s*=\s*'service_role_bootstrap'/, 'Admin access must require privileged verification evidence.');
mustMatch(migration, /safeguarding_admin_quarantine/, 'Unverified legacy admins must be quarantined for review.');

mustMatch(seedAdmin, /process\.env\.SUPERADMIN_PASSWORD/, 'The bootstrap password must come from the environment.');
mustMatch(seedAdmin, /superadminPassword\.length < 16/, 'Bootstrap passwords must meet the minimum length.');
mustNotMatch(seedAdmin, /const\s+SUPERADMIN_PASSWORD\s*=\s*['"]/, 'No bootstrap password may be committed to source.');
mustNotMatch(seedAdmin, /console\.log\([^\n]*superadminPassword/, 'The bootstrap password must not be printed.');
mustNotMatch(seedAdmin, /updateUserById/, 'Rerunning bootstrap must not reset an existing admin password.');
mustMatch(seedAdmin, /admin_verification_method:\s*'service_role_bootstrap'/, 'The service-role bootstrap must record admin verification.');
mustNotMatch(adminSetup, /Default credentials|Change the default superadmin password/i, 'Admin setup must not publish or normalise a shared default credential.');
mustMatch(adminSetup, /Rotate the existing administrator password/, 'Admin setup must require rotation of the exposed bootstrap credential.');

mustNotMatch(authStore, /guest-admin@adaptbuddy\.local/, 'Guest mode must not model an administrator.');
mustMatch(authStore, /profile\?\.role === 'admin'[\s\S]*removeItem\(GUEST_PROFILE_KEY\)/, 'Legacy guest-admin cache must be rejected.');
mustMatch(authStore, /setGuestMode:\s*async[\s\S]*await clearAuthSession\(version\)/, 'Guest mode must clear the local Supabase session first.');
mustNotMatch(authStore, /const applyAuthSession[\s\S]{0,200}hasStoredGuestMode\(\)[\s\S]{0,100}applyNoSessionState/, 'A real Supabase session must never be represented as guest state.');
mustMatch(authStore, /const prepareAuthenticatedTransition[\s\S]*user:\s*null,[\s\S]*profile:\s*null,[\s\S]*session:\s*null/, 'Account transitions must clear the previous account UI before loading the next profile.');
// Runtime probes in test-auth-boundaries cover clearing on account switches and
// continuity during same-account refresh, including verification failures/races.
mustMatch(authStore, /const profile = await loadRequiredProfile\(session\.user\.id, version\)/, 'Auth session events must still verify the canonical profile.');
mustMatch(authStore, /rejectUnverifiedProfile[\s\S]*assertCurrentTransition\(version\)[\s\S]*applySignedOutState\(\)[\s\S]*await clearAuthSession\(signedOutVersion\)/, 'An unverifiable authenticated profile must fail closed and clear its local session.');
mustNotMatch(authStore, /buildFallbackProfile(?:FromUser)?/, 'Authenticated sessions must not authorise roles from a local fallback profile.');
mustNotMatch(guestEntry, /admin:\s*ROUTES\.ADMIN_DASHBOARD|value === 'admin'/, 'The guest URL must not route to admin.');
mustMatch(guestEntry, /await setGuestMode\(role\)/, 'The guest entry route must wait for safe session clearing.');
mustNotMatch(loginPage, /setGuestMode/, 'Login links must let the guest entry route own the session transition.');
mustNotMatch(heroSection, /setGuestMode/, 'Landing links must let the guest entry route own the session transition.');
mustMatch(protectedRoute, /void restoreGuestMode\(\)\.catch/, 'Protected routes must handle unexpected guest-restore rejection.');

mustMatch(adminSetup, /do \*\*not\*\* apply/i, 'Admin setup must label the safeguarding SQL as an unapplied draft.');
mustMatch(migration, /DRAFT ONLY/, 'The database proposal must be visibly marked as draft-only.');

assert.equal(
  packageJson.scripts['test:trusted-adult-safety'],
  'node scripts/test-trusted-adult-safety.js',
  'The safeguarding regression test must have a package script.',
);
mustMatch(
  packageJson.scripts.prebuild,
  /test:trusted-adult-safety/,
  'The safeguarding regression test must run before production builds.',
);

console.log('Trusted-adult safeguarding checks passed.');
