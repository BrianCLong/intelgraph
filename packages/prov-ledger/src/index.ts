export interface ManifestEntry {
  id: string;
  hash: string;
}

export interface Manifest {
  entries: ManifestEntry[];
}

export function verifyManifest(manifest: Manifest): boolean {
  return manifest.entries.every(e => typeof e.id === 'string' && typeof e.hash === 'string');
}
