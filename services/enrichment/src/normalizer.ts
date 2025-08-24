import crypto from 'crypto';

export interface NormalizedEntity {
  id: string;
  provider: string;
  raw: unknown;
}

export function normalize(provider: string, raw: unknown): NormalizedEntity {
  const stable = crypto
    .createHash('sha256')
    .update(provider + JSON.stringify(raw))
    .digest('hex');
  return { id: stable, provider, raw };
}
