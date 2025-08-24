import { createHash } from 'node:crypto';

export interface ManifestEntry {
  id: string;
  type: string;
  payload: unknown;
  checksum: string;
}

export function createManifestEntry(id: string, type: string, payload: unknown): ManifestEntry {
  const checksum = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  return { id, type, payload, checksum };
}
