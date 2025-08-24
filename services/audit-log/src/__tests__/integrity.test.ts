import { computeHash, merkleRoot } from '../index.js';

describe('audit log integrity', () => {
  test('tampering changes merkle root', () => {
    const rec1 = {
      user: 'u',
      action: 'a',
      resource: 'r',
      authorityId: 'id',
      reason: 'ok',
      timestamp: '1',
    };
    const hash1 = computeHash(rec1, '');
    const rec2 = {
      user: 'u2',
      action: 'a2',
      resource: 'r2',
      authorityId: 'id2',
      reason: 'ok2',
      timestamp: '2',
    };
    const hash2 = computeHash(rec2, hash1);
    const root = merkleRoot([hash1, hash2]);
    const tamperedHash2 = computeHash({ ...rec2, reason: 'bad' }, hash1);
    const tamperedRoot = merkleRoot([hash1, tamperedHash2]);
    expect(tamperedRoot).not.toBe(root);
  });
});
