import crypto from 'crypto';
import { z } from 'zod';

// Common record schema used for claims, evidence, and transforms
export const recordSchema = z.object({
  id: z.string(),
  license: z.string(),
  source: z.string()
});

export const chain = [];

export function appendRecord(type, data) {
  const parsed = recordSchema.parse(data);
  const prevHash = chain.length ? chain[chain.length - 1].hash : '';
  const timestamp = new Date().toISOString();
  const record = { ...parsed, type, timestamp, prevHash };
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(record))
    .digest('hex');
  const entry = { ...record, hash };
  chain.push(entry);
  return entry;
}

export function createManifest() {
  const manifest = { records: chain };
  const sha256 = crypto
    .createHash('sha256')
    .update(JSON.stringify(manifest))
    .digest('hex');
  return { manifest, sha256 };
}
