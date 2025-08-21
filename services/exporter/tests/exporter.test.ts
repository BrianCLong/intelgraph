import { createExport, ExportRequest } from '../src/exporter';
import JSZip from 'jszip';
import { createHash } from 'crypto';

const sample: ExportRequest = {
  entities: [{ id: '1', name: 'Alice', secret: 's1' }],
  edges: [{ source: '1', target: '2', weight: 5, secret: 'e1' }],
  redactRules: [{ field: 'secret', action: 'drop' }],
  format: ['json', 'csv', 'pdf'],
};

describe('exporter', () => {
  it('creates manifest with correct hashes', async () => {
    const zipBuf = await createExport(sample);
    const zip = await JSZip.loadAsync(zipBuf);
    const manifestStr = await zip.file('manifest.json')!.async('string');
    const manifest = JSON.parse(manifestStr);
    for (const file of manifest.files) {
      const content = await zip.file(file.path)!.async('nodebuffer');
      const hash = createHash('sha256').update(content).digest('hex');
      expect(hash).toBe(file.sha256);
    }
    const entitiesJson = await zip.file('data/entities.json')!.async('string');
    expect(entitiesJson).toBe('[{"id":"1","name":"Alice"}]');
  });

  it('produces identical zip for same input', async () => {
    const z1 = await createExport(sample);
    const z2 = await createExport(sample);
    const h1 = createHash('sha256').update(z1).digest('hex');
    const h2 = createHash('sha256').update(z2).digest('hex');
    expect(h1).toBe(h2);
  });
});
