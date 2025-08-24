const { execFile } = require('child_process');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const { resolveOpa } = require('./opa');

class PolicyAudit {
  constructor(opts) {
    this.policyDir = opts.policyDir;
    this.auditDir = opts.auditDir;
    this._opaOpts = {
      opaPath: opts.opaPath,
      opaUrl: opts.opaUrl,
      opaSha256: opts.opaSha256,
    };
    this._opaPromise = null;
  }

  async evaluate(input) {
    if (!this._opaPromise) this._opaPromise = resolveOpa(this._opaOpts);
    const opaPath = await this._opaPromise;
    return new Promise((resolve, reject) => {
      const child = execFile(
        opaPath,
        [
          'eval',
          '--format=json',
          '--data',
          this.policyDir,
          '--stdin-input',
          'data.policy.decision',
        ],
        (err, stdout, stderr) => {
          if (err) {
            reject(new Error(`OPA evaluation failed: ${stderr || err.message}`));
            return;
          }
          try {
            const parsed = JSON.parse(stdout.toString());
            resolve(parsed.result[0].expressions[0].value);
          } catch {
            reject(new Error('OPA evaluation returned invalid JSON'));
          }
        },
      );
      child.stdin.end(JSON.stringify(input));
    });
  }

  async evaluateAndAudit(input) {
    const result = await this.evaluate(input);
    await this.audit({
      decision: result.allow ? 'allow' : 'deny',
      reason: result.reason,
      subject: input.subject,
      resource: input.resource,
    });
    return result;
  }

  async audit(entry) {
    if (!entry?.decision || !entry?.reason || !entry?.subject || !entry?.resource) {
      throw new Error('decision, reason, subject, and resource required');
    }
    const date = new Date().toISOString().slice(0, 10);
    const file = path.join(this.auditDir, `audit-${date}.log`);
    const prevHash = await this._lastHash(file);
    const id = crypto.randomUUID();
    const record = { id, timestamp: new Date().toISOString(), ...entry, prevHash };
    const hash = crypto
      .createHash('sha256')
      .update(prevHash + JSON.stringify(record))
      .digest('hex');
    record.hash = hash;
    await fsp.mkdir(this.auditDir, { recursive: true });
    await fsp.appendFile(file, JSON.stringify(record) + '\n');
    return id;
  }

  async _lastHash(file) {
    try {
      const content = await fsp.readFile(file, 'utf8');
      const lines = content.trim().split('\n');
      if (!lines.length) return '';
      return JSON.parse(lines[lines.length - 1]).hash;
    } catch {
      return '';
    }
  }
}

function verifyAuditChain(file) {
  if (!fs.existsSync(file)) return true;
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  let prev = '';
  for (const line of lines) {
    const item = JSON.parse(line);
    const { hash, ...rest } = item;
    const calc = crypto
      .createHash('sha256')
      .update(prev + JSON.stringify(rest))
      .digest('hex');
    if (hash !== calc) return false;
    prev = hash;
  }
  return true;
}

function verifyAuditChainDetailed(file) {
  if (!fs.existsSync(file)) return { valid: true, index: -1 };
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  let prev = '';
  for (let i = 0; i < lines.length; i++) {
    const item = JSON.parse(lines[i]);
    const { hash, ...rest } = item;
    const calc = crypto
      .createHash('sha256')
      .update(prev + JSON.stringify(rest))
      .digest('hex');
    if (hash !== calc) return { valid: false, index: i };
    prev = hash;
  }
  return { valid: true, index: lines.length - 1 };
}

module.exports = { PolicyAudit, verifyAuditChain, verifyAuditChainDetailed };
