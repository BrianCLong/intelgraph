import { createHash, createHmac } from 'crypto';

export interface ProvenanceRecord {
  inputHash: string;
  algorithm: string;
  version: string;
  timestamp: string;
  signature: string;
}

const SECRET = process.env.PROVENANCE_SECRET || 'dev-secret';

export function createProvenanceRecord(
  data: Buffer | string,
  algorithm = 'SHA-256',
  version = '1',
  timestamp = new Date().toISOString(),
): ProvenanceRecord {
  const hash = createHash('sha256').update(data).digest('hex');
  const signature = createHmac('sha256', SECRET)
    .update(`${hash}|${algorithm}|${version}|${timestamp}`)
    .digest('hex');
  return { inputHash: hash, algorithm, version, timestamp, signature };
}
