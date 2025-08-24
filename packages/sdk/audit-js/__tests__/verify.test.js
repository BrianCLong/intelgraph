import crypto from 'node:crypto';
import { merkleRoot, verifyBundle } from '../src/index.js';

describe('audit sdk', () => {
  test('verifyBundle detects tampering', () => {
    const hashes = [
      crypto.createHash('sha256').update('a').digest('hex'),
      crypto.createHash('sha256').update('b').digest('hex'),
    ];
    const root = merkleRoot(hashes);
    const bundle = { hashes: [...hashes], merkleRoot: root };
    expect(verifyBundle(bundle)).toBe(true);
    bundle.hashes[1] = crypto.createHash('sha256').update('c').digest('hex');
    expect(verifyBundle(bundle)).toBe(false);
  });
});
