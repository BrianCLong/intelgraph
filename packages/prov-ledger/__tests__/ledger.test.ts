import { hashContent, hashJson, recordStep, verifyManifest, ProvenanceManifest } from '../src/index';

describe('provenance helpers', () => {
  it('hashJson matches hashContent of stringified data', () => {
    const obj = { a: 1 };
    expect(hashJson(obj)).toBe(hashContent(JSON.stringify(obj)));
  });

  it('recordStep appends hashed step', () => {
    const manifest: ProvenanceManifest = { artifactId: 'a1', steps: [] };
    const step = recordStep(manifest, {
      id: 's1',
      tool: 'test',
      params: {},
      input: 'in',
      output: 'out',
    });
    expect(manifest.steps).toHaveLength(1);
    expect(step.outputHash).toBe(hashContent('out'));
  });

  it('verifyManifest returns true for matching hashes', () => {
    const manifest: ProvenanceManifest = { artifactId: 'a1', steps: [] };
    recordStep(manifest, {
      id: 'step1',
      tool: 'test',
      params: {},
      input: 'in',
      output: 'result',
      timestamp: '2024-01-01T00:00:00Z',
    });
    const ok = verifyManifest(manifest, { step1: 'result' });
    expect(ok).toBe(true);
  });

  it('verifyManifest returns false for missing artifacts', () => {
    const manifest: ProvenanceManifest = { artifactId: 'a1', steps: [] };
    recordStep(manifest, {
      id: 'step1',
      tool: 'test',
      params: {},
      input: 'in',
      output: 'result',
    });
    const ok = verifyManifest(manifest, {});
    expect(ok).toBe(false);
  });
});
