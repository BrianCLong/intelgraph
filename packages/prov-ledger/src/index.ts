import crypto from 'crypto';

export interface Manifest {
  id: string;
  createdAt: string;
  payload: Record<string, unknown>;
  signature: string;
}

export function createManifest(payload: Record<string, unknown>): Manifest {
  const data = JSON.stringify(payload);
  const signature = crypto.createHash('sha256').update(data).digest('hex');
  return {
    id: signature,
    createdAt: new Date().toISOString(),
    payload,
    signature
  };
}
