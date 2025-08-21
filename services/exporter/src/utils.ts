import { createHash } from 'crypto';

export const sha256 = (buf: Buffer): string =>
  createHash('sha256').update(buf).digest('hex');

export const sortObject = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj
      .map((v) => sortObject(v))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  if (obj && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {};
    Object.keys(obj as Record<string, unknown>)
      .sort()
      .forEach((k) => {
        sorted[k] = sortObject((obj as Record<string, unknown>)[k]);
      });
    return sorted;
  }
  return obj;
};
