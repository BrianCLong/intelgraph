import crypto from 'crypto';

// Deterministic tokenization using AES-256-CTR with IV derived from AAD.
// Placeholder for AES-SIV via Google Tink.
const KEY = crypto
  .createHash('sha256')
  .update(process.env.PRIVACY_TOKEN_KEY || 'dev-secret')
  .digest();

function deriveIv(aad: Record<string, string>): Buffer {
  return crypto.createHash('sha256').update(JSON.stringify(aad)).digest().subarray(0, 16);
}

export function tokenize(value: string, aad: Record<string, string>): string {
  const iv = deriveIv(aad);
  const cipher = crypto.createCipheriv('aes-256-ctr', KEY, iv);
  const ct = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `tok_${ct.toString('base64url')}`;
}

export function detokenize(token: string, aad: Record<string, string>): string {
  if (!token.startsWith('tok_')) throw new Error('invalid token');
  const iv = deriveIv(aad);
  const decipher = crypto.createDecipheriv('aes-256-ctr', KEY, iv);
  const pt = Buffer.concat([
    decipher.update(Buffer.from(token.slice(4), 'base64url')),
    decipher.final(),
  ]);
  return pt.toString('utf8');
}
