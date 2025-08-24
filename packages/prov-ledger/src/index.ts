import crypto from 'crypto';

export interface Manifest {
  id: string;
  createdAt: string;
  payload: unknown;
}

export function sign(manifest: Manifest): { manifest: Manifest; signature: string } {
  const data = JSON.stringify(manifest);
  const signature = crypto.createHash('sha256').update(data).digest('hex');
  return { manifest, signature };
}

export function verify(manifest: Manifest, signature: string): boolean {
  return sign(manifest).signature === signature;
}
