import { toASCII } from 'punycode';

export type IoCType = 'ip' | 'domain' | 'sha256' | 'url' | 'email';

/**
 * Normalize indicator values into a canonical form for deduplication.
 * @param type Type of IoC (ip, domain, sha256, url, email)
 * @param v Raw IoC value
 */
export function normalizeIoC(type: IoCType, v: string): string {
  switch (type) {
    case 'ip':
      return v.trim();
    case 'domain':
      return toASCII(v.toLowerCase());
    case 'sha256':
      return v.toLowerCase();
    case 'url':
      try {
        return new URL(v).toString();
      } catch {
        return v;
      }
    case 'email':
      return v.toLowerCase().replace(/\+.*@/, '@');
    default:
      return v;
  }
}

/**
 * Fuse multiple confidence scores into a single probability.
 * @param confidences Array of confidence values (0-100)
 */
export function fuse(confidences: number[]): number {
  const probs = confidences.map((c) => {
    const clamped = Math.min(Math.max(c, 0), 100);
    return clamped / 100;
  });
  const combined = 1 - probs.reduce((acc, p) => acc * (1 - p), 1);
  return Math.round(combined * 100);
}
