import express from 'express';
import crypto from 'node:crypto';

interface AuditRecord {
  user: string;
  action: string;
  resource: string;
  authorityId: string;
  reason: string;
  timestamp: string;
  hash: string;
}

export const app = express();
app.use(express.json());

export const log: AuditRecord[] = [];

export function computeHash(record: Omit<AuditRecord, 'hash'>, prevHash: string): string {
  const data = JSON.stringify(record) + prevHash;
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function merkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return '';
  let nodes = hashes.map((h) => Buffer.from(h, 'hex'));
  while (nodes.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i];
      const right = i + 1 < nodes.length ? nodes[i + 1] : nodes[i];
      next.push(
        crypto
          .createHash('sha256')
          .update(Buffer.concat([left, right]))
          .digest(),
      );
    }
    nodes = next;
  }
  return nodes[0].toString('hex');
}

app.post('/audit/append', (req, res) => {
  const records = Array.isArray(req.body.records) ? req.body.records : [];
  const offsets: number[] = [];
  const hashes: string[] = [];

  for (const r of records) {
    const base = {
      user: r.user,
      action: r.action,
      resource: r.resource,
      authorityId: r.authorityId,
      reason: r.reason,
      timestamp: new Date().toISOString(),
    };
    const prevHash = log.length ? log[log.length - 1].hash : '';
    const hash = computeHash(base, prevHash);
    log.push({ ...base, hash });
    offsets.push(log.length - 1);
    hashes.push(hash);
  }

  res.json({ offsets, merkleRoot: merkleRoot(hashes) });
});

app.get('/audit/query', (req, res) => {
  const { user, action, resource, start, end } = req.query;
  let results = log.slice();
  if (user) results = results.filter((r) => r.user === user);
  if (action) results = results.filter((r) => r.action === action);
  if (resource) results = results.filter((r) => r.resource === resource);
  if (start) results = results.filter((r) => r.timestamp >= start);
  if (end) results = results.filter((r) => r.timestamp <= end);
  res.json({ records: results });
});

export default app;
