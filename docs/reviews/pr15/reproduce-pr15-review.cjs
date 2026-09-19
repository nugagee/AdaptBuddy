// Isolated review probes against the unchanged PR source. No network or live data.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { create } = require('zustand');

if (!process.argv[2]) {
  console.error('Usage: node docs/reviews/pr15/reproduce-pr15-review.cjs /path/to/exact-pr15-checkout');
  process.exit(2);
}
const root = path.resolve(process.argv[2]);
function loadTs(relativePath, dependencies) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relativePath), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  const storage = new Map();
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  };
  vm.runInNewContext(code, {
    exports, console, localStorage, window: { localStorage, setTimeout },
    setTimeout, clearTimeout,
    require: (name) => {
      if (!(name in dependencies)) throw new Error(`Unmocked dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename: relativePath });
  return exports;
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

async function main() {
  const rawLegacyAdult = {
    id: 'invitation-test', adult_id: 'adult-test', name: 'Test Adult',
    role: 'parent', email: 'adult@example.invalid', phone: 'test-only', status: 'connected',
  };
  const writes = [];
  const service = loadTs('src/services/supabase/autismProfileService.ts', {
    './client': {
      isSupabaseConfigured: true,
      getSupabaseClient: () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'child-test' } }, error: null }) },
        rpc: async (name) => {
          writes.push(name);
          return { data: rawLegacyAdult, error: null };
        },
      }),
    },
  });
  const mapped = await service.saveTrustedAdultForChild('child-test', rawLegacyAdult);
  assert.equal(writes[0], 'add_trusted_adult_for_child');
  assert.equal(rawLegacyAdult.status, 'connected');
  assert.equal(mapped.status, 'pending');
  console.log('CONFIRMED: legacy RPC connected row is presented as pending; the mapper does not prevent the RPC side effect.');

  let authCallback;
  let resolveProfile;
  const profilePending = new Promise((resolve) => { resolveProfile = resolve; });
  const client = {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: (callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      signOut: async () => ({ error: null }),
    },
  };
  const { useAuthStore } = loadTs('src/store/authStore.ts', {
    zustand: { create },
    'services/supabase/client': {
      getProfile: () => profilePending,
      getSupabaseClient: () => client,
      isSupabaseConfigured: true,
    },
    'features/child/store/childSessionStore': { useChildSessionStore: { getState: () => ({ resetSession() {} }) } },
    'features/child/store/trustedAdultStore': { useTrustedAdultStore: { getState: () => ({ clearTrustedAdults() {} }) } },
    'services/supabase/authService': {},
    'services/supabase/sessionUtils': { toAuthSessionState: () => ({ test: true }) },
  });
  const cleanup = useAuthStore.getState().initialize();
  await tick();
  authCallback('SIGNED_IN', { user: { id: 'child-A-test' } });
  await tick();
  authCallback('SIGNED_OUT', null);
  assert.equal(useAuthStore.getState().user, null);
  resolveProfile({ id: 'child-A-test', role: 'child', first_name: 'Synthetic A' });
  await tick();
  assert.equal(useAuthStore.getState().user?.id, 'child-A-test');
  console.log('CONFIRMED: delayed profile load restores child A in the UI after SIGNED_OUT.');
  cleanup();
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
