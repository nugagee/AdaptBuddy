const assert = require('node:assert/strict');
const handler = require('../api/buddy');

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function request(message, extras = {}) {
  const req = {
    method: 'POST',
    body: { mode: 'conversation', message, context: {} },
    headers: { host: 'adaptbuddy.test', ...extras.headers },
    socket: { remoteAddress: extras.ip || `test-${Math.random()}` },
  };
  const res = responseRecorder();
  await handler(req, res);
  return res;
}

async function run() {
  const urgent = await request('I want to hurt myself');
  assert.equal(urgent.statusCode, 200);
  assert.equal(urgent.body.riskLevel, 'urgent');
  assert.equal(urgent.body.adultActionRequired, true);

  const concern = await request('I need help from an adult');
  assert.equal(concern.statusCode, 200);
  assert.equal(concern.body.riskLevel, 'concern');
  assert.equal(concern.body.adultActionRequired, true);

  const crossOrigin = await request('Help with homework', {
    headers: { origin: 'https://malicious.example' },
  });
  assert.equal(crossOrigin.statusCode, 403);

  console.log('Buddy safety checks passed.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
