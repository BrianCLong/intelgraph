import crypto from 'node:crypto';

export interface ManifestEntry {
  id: string;
  sha256: string;
  createdAt: string;
}

export function createManifest(id: string, data: Buffer | string): ManifestEntry {
  const buf = typeof data === 'string' ? Buffer.from(data) : data;
  return {
    id,
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    createdAt: new Date().toISOString()
  };
}
