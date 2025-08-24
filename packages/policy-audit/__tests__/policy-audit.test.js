const fs = require('fs');
const path = require('path');
const { PolicyAudit, verifyAuditChain, verifyAuditChainDetailed } = require('..');

const policyDir = path.join(__dirname, '../../../contracts/policy');
const auditDir = path.join(__dirname, '../../../tmp-audit');

jest.setTimeout(60000);

beforeAll(() => {
  fs.rmSync(auditDir, { recursive: true, force: true });
  fs.mkdirSync(auditDir, { recursive: true });
});

test('allows only authorized attributes', async () => {
  const pa = new PolicyAudit({ policyDir, auditDir });
  const input = {
    subject: { clearance: 'topsecret', license: 'export' },
    action: 'read',
    resource: { classification: 'topsecret', license: 'export' },
    context: { purpose: 'investigation' },
  };
  const result = await pa.evaluate(input);
  expect(result.allow).toBe(true);
  expect(result.reason).toBe('authorized');
});

test('randomized deny-by-default', async () => {
  const pa = new PolicyAudit({ policyDir, auditDir });
  const rand = () => Math.random().toString(36).slice(2, 7);
  for (let i = 0; i < 50; i++) {
    const data = {
      subject: { clearance: rand(), license: rand() },
      action: rand(),
      resource: { classification: rand(), license: rand() },
      context: { purpose: rand() },
    };
    const result = await pa.evaluate(data);
    const auth =
      data.subject.clearance === 'topsecret' &&
      data.resource.classification === 'topsecret' &&
      data.subject.license === 'export' &&
      data.resource.license === 'export' &&
      data.context.purpose === 'investigation';
    if (auth) {
      expect(result.allow).toBe(true);
      expect(result.reason).toBe('authorized');
    } else {
      expect(result.allow).toBe(false);
      expect(typeof result.reason).toBe('string');
      expect(result.reason).not.toBe('authorized');
    }
  }
});

test('provides specific denial reasons', async () => {
  const pa = new PolicyAudit({ policyDir, auditDir });
  let res = await pa.evaluate({
    subject: { clearance: 'secret', license: 'export' },
    action: 'read',
    resource: { classification: 'topsecret', license: 'export' },
    context: { purpose: 'investigation' },
  });
  expect(res).toEqual({ allow: false, reason: 'insufficient-clearance' });
  res = await pa.evaluate({
    subject: { clearance: 'topsecret', license: 'import' },
    action: 'read',
    resource: { classification: 'topsecret', license: 'export' },
    context: { purpose: 'investigation' },
  });
  expect(res).toEqual({ allow: false, reason: 'license-mismatch' });
  res = await pa.evaluate({
    subject: { clearance: 'topsecret', license: 'export' },
    action: 'read',
    resource: { classification: 'topsecret', license: 'export' },
    context: { purpose: 'research' },
  });
  expect(res).toEqual({ allow: false, reason: 'invalid-purpose' });
});

test('tamper detection', async () => {
  const pa = new PolicyAudit({ policyDir, auditDir });
  await pa.audit({ decision: 'deny', reason: 'x', subject: {}, resource: {} });
  const file = path.join(
    auditDir,
    fs.readdirSync(auditDir).find((f) => f.endsWith('.log')),
  );
  expect(verifyAuditChain(file)).toBe(true);
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  const first = JSON.parse(lines[0]);
  first.reason = 'tampered';
  lines[0] = JSON.stringify(first);
  fs.writeFileSync(file, lines.join('\n') + '\n');
  expect(verifyAuditChain(file)).toBe(false);
  const detail = verifyAuditChainDetailed(file);
  expect(detail.valid).toBe(false);
  expect(detail.index).toBe(0);
});

test('audit requires all fields', async () => {
  const pa = new PolicyAudit({ policyDir, auditDir });
  await expect(pa.audit({ decision: 'allow', reason: 'x', subject: {} })).rejects.toThrow(
    'decision, reason, subject, and resource required',
  );
});

test('evaluateAndAudit convenience', async () => {
  const pa = new PolicyAudit({ policyDir, auditDir });
  const input = {
    subject: { clearance: 'topsecret', license: 'export' },
    action: 'read',
    resource: { classification: 'topsecret', license: 'export' },
    context: { purpose: 'investigation' },
  };
  const result = await pa.evaluateAndAudit(input);
  expect(result.allow).toBe(true);
  const file = path.join(
    auditDir,
    fs.readdirSync(auditDir).find((f) => f.endsWith('.log')),
  );
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  const rec = JSON.parse(lines[lines.length - 1]);
  expect(rec.reason).toBe('authorized');
});
