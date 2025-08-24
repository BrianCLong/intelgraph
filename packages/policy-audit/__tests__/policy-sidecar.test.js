const fs = require('fs');
const path = require('path');
const http = require('http');
const { verifyAuditChain } = require('..');
const { createServer } = require('../../../services/policy-sidecar/server');

const policyDir = path.join(__dirname, '../../../contracts/policy');
const auditDir = path.join(__dirname, '../../../tmp-sidecar-audit');

beforeAll(() => {
  fs.rmSync(auditDir, { recursive: true, force: true });
  fs.mkdirSync(auditDir, { recursive: true });
});

jest.setTimeout(60000);

afterEach(() => {
  // cleanup logs after each test
  fs.rmSync(auditDir, { recursive: true, force: true });
  fs.mkdirSync(auditDir, { recursive: true });
});

test('sidecar eval and audit endpoints', async () => {
  const server = createServer({ policyDir, auditDir });
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const evalPayload = {
    subject: { clearance: 'topsecret', license: 'export' },
    action: 'read',
    resource: { classification: 'topsecret', license: 'export' },
    context: { purpose: 'investigation' },
  };

  const evalRes = await request(port, '/v0/eval', evalPayload);
  expect(evalRes.allow).toBe(true);
  expect(evalRes.reason).toBe('authorized');

  const auditRes = await request(port, '/v0/audit', {
    decision: 'allow',
    reason: 'authorized',
    subject: {},
    resource: {},
  });
  expect(auditRes.auditId).toBeDefined();
  await new Promise((resolve) => server.close(resolve));

  const file = path.join(
    auditDir,
    fs.readdirSync(auditDir).find((f) => f.endsWith('.log')),
  );
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  const rec = JSON.parse(lines[0]);
  expect(rec.reason).toBe('authorized');
  expect(verifyAuditChain(file)).toBe(true);
  // tamper attempt should break chain
  rec.reason = 'tampered';
  fs.writeFileSync(file, JSON.stringify(rec) + '\n');
  expect(verifyAuditChain(file)).toBe(false);
});

test('sidecar returns denial reasons', async () => {
  const server = createServer({ policyDir, auditDir });
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const payload = {
    subject: { clearance: 'topsecret', license: 'import' },
    action: 'read',
    resource: { classification: 'topsecret', license: 'export' },
    context: { purpose: 'investigation' },
  };
  const res = await request(port, '/v0/eval', payload);
  expect(res.allow).toBe(false);
  expect(res.reason).toBe('license-mismatch');
  await new Promise((resolve) => server.close(resolve));
});

test('audit endpoint validates fields', async () => {
  const server = createServer({ policyDir, auditDir });
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const res = await request(port, '/v0/audit', { decision: 'allow' });
  expect(res.error).toMatch('decision, reason, subject, and resource required');
  await new Promise((resolve) => server.close(resolve));
});

function request(port, route, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: '127.0.0.1',
      port,
      path: route,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = http.request(opts, (res) => {
      let resp = '';
      res.on('data', (chunk) => (resp += chunk));
      res.on('end', () => resolve(JSON.parse(resp)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}
