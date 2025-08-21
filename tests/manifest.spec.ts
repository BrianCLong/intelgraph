import { buildManifest } from '../services/prov-ledger/src/lib/manifest';

describe('manifest', () => {
  it('builds a merkle root deterministically', () => {
    const artifacts = [
      { id: 'a1', sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
      { id: 'a2', sha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }
    ];
    const m = buildManifest(artifacts as any);
    expect(m.merkleRoot).toMatch(/^[a-f0-9]{64}$/);
    expect(m.artifacts.length).toBe(2);
  });

  it('throws on empty input', () => {
    expect(() => buildManifest([] as any)).toThrow('no_artifacts');
  });
});
