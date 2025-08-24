import crypto from 'crypto';

export interface ManifestEntry {
  id: string;
  hash: string;
  timestamp: string;
}

export function createEntry(id: string, data: string): ManifestEntry {
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  return { id, hash, timestamp: new Date().toISOString() };
}

export function verifyEntry(entry: ManifestEntry, data: string): boolean {
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  return entry.hash === hash;
}
