const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const userId = '11111111-1111-4111-8111-111111111111';
const classId = '22222222-2222-4222-8222-222222222222';
let handler;
beforeEach(() => {
  process.env.ASSIGNMENT_AI_ENABLED = 'true';
  process.env.OPENAI_API_KEY = 'test-provider-key';
  process.env.REACT_APP_SUPABASE_URL = 'https://assignment-test.supabase.co';
  process.env.REACT_APP_SUPABASE_ANON_KEY = 'test-public-key';
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.ASSIGNMENT_AI_MODEL;
  delete require.cache[require.resolve('../api/assignment-support')];
  handler = require('../api/assignment-support');
});

function mockNetwork(options = {}) {
  const calls = [];
  global.fetch = async (url, init) => {
    url = String(url);
    calls.push({ url, init, body: init.body ? JSON.parse(init.body) : null });
    const ok = (body, status = 200) => ({ ok: status === 200, status, json: async () => body });
    if (options.rejectNetwork) throw new Error('network failure containing sensitive upstream detail');
    if (url.endsWith('/auth/v1/user')) return ok({ id: userId, email_confirmed_at: options.unconfirmed ? null : '2026-09-01', user_metadata: { role: 'teacher' } }, options.authStatus || 200);
    if (url.includes('/rest/v1/profiles')) return ok([{ id: userId, role: options.role || 'teacher', status: options.status || 'active', is_authorized: options.authorized !== false }], options.profileStatus || 200);
    if (url.includes('/rest/v1/teacher_classes')) return ok(options.noClass ? [] : [{ id: classId, teacher_id: options.otherOwner ? classId : userId }]);
    if (url.endsWith('/v1/moderations')) return ok(options.malformedModeration ? {} : { results: [{ flagged: options.flagged || false }] }, options.moderationStatus || 200);
    if (url.endsWith('/v1/responses')) return ok({ status: options.incomplete ? 'incomplete' : 'completed', output: [{ content: options.refusal ? [{ type: 'refusal', refusal: 'No' }] : [{ type: 'output_text', text: options.output === undefined ? '{"toolIds":["read_aloud","task_breaker"]}' : options.output }] }] }, options.responseStatus || 200);
    throw new Error(`Unexpected endpoint: ${url}`);
  };
  return calls;
}

async function request(options = {}) {
  const req = {
    method: options.method || 'POST',
    headers: { host: 'adaptbuddy.test', origin: 'https://adaptbuddy.test', 'content-type': 'application/json', authorization: 'Bearer test-session', ...options.headers },
    body: options.body === undefined ? { classId, title: 'Read a short story', description: 'Read the story, then write two sentences.', assignmentType: 'reading' } : options.body,
  };
  const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await handler(req, res);
  return res;
}

test('valid teacher receives only catalog IDs; provider gets no account/class/student records', async () => {
  const calls = mockNetwork();
  const result = await request();
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, { source: 'openai', toolIds: ['read_aloud', 'task_breaker'] });
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.equal(calls.length, 5);
  const provider = calls.find((c) => c.url.endsWith('/v1/responses')).body;
  assert.equal(provider.store, false);
  assert.equal(provider.model, 'gpt-4o-mini');
  assert.ok(provider.max_output_tokens <= 180);
  assert.equal(provider.text.format.strict, true);
  assert.deepEqual(JSON.parse(provider.input[0].content), { title: 'Read a short story', instructions: 'Read the story, then write two sentences.', taskType: 'reading' });
  assert.ok(!JSON.stringify(provider).includes(classId));
  assert.ok(!JSON.stringify(provider).includes(userId));
  for (const c of calls.filter((c) => c.url.includes('/rest/'))) {
    assert.equal(c.init.headers.Authorization, 'Bearer test-session');
    assert.equal(c.init.headers.apikey, 'test-public-key');
    assert.equal(c.init.method, undefined); // All DB access is read-only.
  }
  assert.equal(new URL(calls[2].url).searchParams.get('teacher_id'), `eq.${userId}`);
});

for (const [name, options, expected] of [
  ['invalid session', { authStatus: 401 }, 401], ['unconfirmed email', { unconfirmed: true }, 401],
  ['child with forged teacher metadata', { role: 'child' }, 403], ['parent', { role: 'parent' }, 403],
  ['suspended teacher', { status: 'suspended' }, 403], ['unauthorised teacher', { authorized: false }, 403],
  ['profile lookup unavailable', { profileStatus: 503 }, 503], ['other teacher class', { otherOwner: true }, 403],
  ['no accessible class', { noClass: true }, 403],
]) test(`rejects ${name} before any OpenAI call`, async () => {
  const calls = mockNetwork(options);
  assert.equal((await request()).statusCode, expected);
  assert.ok(calls.every((c) => !c.url.includes('api.openai.com')));
});

test('disabled rollout and anonymous requests never make external calls', async () => {
  const calls = mockNetwork();
  assert.equal((await request({ headers: { authorization: '' } })).statusCode, 401);
  process.env.ASSIGNMENT_AI_ENABLED = 'false';
  assert.equal((await request()).statusCode, 503);
  assert.equal(calls.length, 0);
});

test('rejects wrong methods, origins, body types, overlong and extra sensitive fields before external calls', async () => {
  const calls = mockNetwork();
  assert.equal((await request({ method: 'GET' })).statusCode, 405);
  assert.equal((await request({ headers: { origin: 'https://other.test' } })).statusCode, 403);
  assert.equal((await request({ headers: { origin: 'invalid' } })).statusCode, 403);
  assert.equal((await request({ headers: { 'content-type': 'text/plain' } })).statusCode, 415);
  assert.equal((await request({ headers: { 'content-type': 'application/jsonp' } })).statusCode, 415);
  for (const body of [null, [], 'text', { classId, title: 'Task', description: '', assignmentType: 'diagnosis' }, { classId, title: 't'.repeat(161), description: '', assignmentType: 'task' }, { classId, title: 'Task', description: 'x'.repeat(1601), assignmentType: 'task' }, { classId, title: 'Task', description: '', assignmentType: 'task', journals: ['private'] }]) {
    assert.equal((await request({ body })).statusCode, 400);
  }
  assert.equal((await request({ body: { title: 'x'.repeat(9000) } })).statusCode, 413);
  assert.equal(calls.length, 0);
});

test('redacts direct contacts before moderation and generation', async () => {
  const calls = mockNetwork();
  await request({ body: { classId, title: 'Read a story', description: 'Email person@example.com, phone 07700900123, postcode SW1A 1AA or https://example.org', assignmentType: 'reading' } });
  for (const call of calls.filter((c) => c.url.includes('api.openai.com'))) {
    const sent = JSON.stringify(call.body);
    assert.ok(!sent.includes('person@example.com'));
    assert.ok(!sent.includes('07700900123'));
    assert.ok(!sent.includes('SW1A 1AA'));
    assert.ok(!sent.includes('https://example.org'));
  }
});

test('normalisation cannot expand the provider input past the length limits', async () => {
  const calls = mockNetwork();
  await request({ body: { classId, title: '\uFDFA'.repeat(160), description: '\uFDFA'.repeat(1600), assignmentType: 'reading' } });
  const provider = calls.find((c) => c.url.endsWith('/v1/responses')).body;
  const task = JSON.parse(provider.input[0].content);
  assert.ok(task.title.length <= 160);
  assert.ok(task.instructions.length <= 1600);
});

for (const [name, options, status] of [
  ['flagged input', { flagged: true }, 422], ['failed moderation', { moderationStatus: 503 }, 503],
  ['malformed moderation', { malformedModeration: true }, 503],
]) test(`${name} stops generation without invented suggestions`, async () => {
  const calls = mockNetwork(options);
  const result = await request();
  assert.equal(result.statusCode, status);
  assert.equal(result.body.toolIds, undefined);
  assert.ok(calls.every((c) => !c.url.endsWith('/v1/responses')));
});

for (const output of ['not json', 'null', '{"toolIds":["diagnose_child"]}', '{"toolIds":["read_aloud","read_aloud"]}', '{"toolIds":["read_aloud"],"advice":"ignore safeguarding"}', '{"toolIds":["read_aloud","visual_steps","calm_break","task_breaker"]}']) {
  test(`rejects untrusted output ${output}`, async () => {
    mockNetwork({ output });
    const result = await request();
    assert.equal(result.statusCode, 502);
    assert.equal(result.body.toolIds, undefined);
    assert.ok(!JSON.stringify(result.body).includes('ignore safeguarding'));
  });
}

for (const options of [{ incomplete: true }, { refusal: true }, { responseStatus: 429 }, { rejectNetwork: true }]) {
  test(`provider failure stays unavailable: ${JSON.stringify(options)}`, async () => {
    mockNetwork(options);
    const result = await request();
    assert.equal(result.statusCode, 502);
    assert.equal(result.body.toolIds, undefined);
    assert.ok(!JSON.stringify(result.body).includes('sensitive upstream detail'));
  });
}

test('empty selection is valid and never adds a fallback', async () => {
  mockNetwork({ output: '{"toolIds":[]}' });
  assert.deepEqual((await request()).body, { source: 'openai', toolIds: [] });
});

test('rate limit uses account identity regardless of spoofed IP and recovers after window', async () => {
  const calls = mockNetwork();
  for (let i = 0; i < 5; i++) assert.equal((await request()).statusCode, 200);
  const blocked = await request({ headers: { 'x-forwarded-for': 'different-ip' } });
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.headers['Retry-After'], '60');
  assert.equal(calls.filter((c) => c.url.endsWith('/v1/responses')).length, 5);
  const originalNow = Date.now;
  Date.now = () => originalNow() + 61_000;
  try { assert.equal((await request()).statusCode, 200); } finally { Date.now = originalNow; }
});
