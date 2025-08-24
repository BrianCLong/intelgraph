import { createHash } from 'crypto';

export interface ManifestEntry {
  path: string;
  hash: string;
}

export function createManifest(entries: { path: string; data: string }[]): ManifestEntry[] {
  return entries.map(e => ({ path: e.path, hash: createHash('sha256').update(e.data).digest('hex') }));
}

export function verifyManifest(entries: { path: string; data: string }[], manifest: ManifestEntry[]): boolean {
  const m = createManifest(entries);
  return m.every((e, i) => e.hash === manifest[i].hash);
}
