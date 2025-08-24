import crypto from 'crypto';

export function manifest(obj: unknown) {
  const json = JSON.stringify(obj);
  const hash = crypto.createHash('sha256').update(json).digest('hex');
  return { hash, json };
}
