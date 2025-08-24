import { createHash } from 'crypto';

export function signManifest(manifest: object): { manifest: object; sha256: string } {
  const data = JSON.stringify(manifest);
  const sha256 = createHash('sha256').update(data).digest('hex');
  return { manifest, sha256 };
}
