import {
  registerEvidence,
  createClaim,
  buildManifest,
  verifyClaim,
  merkleRoot,
  checkLicenses,
} from '../src/ledger';
import { verifyBundle } from '../src/cli';
import fs from 'fs';
import tar from 'tar-stream';
import { createGzip } from 'zlib';
import path from 'path';

describe('prov-ledger', () => {
  test('manifest verification', async () => {
    const ev = registerEvidence({
      contentHash: 'abcd',
      licenseId: 'L1',
      source: 'src',
      transforms: [],
    });
    const cl = createClaim({
      evidenceIds: [ev.id],
      text: 'test claim',
      confidence: 0.9,
      links: [],
    });
    const manifest = buildManifest([cl.id]);
    expect(verifyClaim(manifest.claims[0])).toBe(true);
    expect(manifest.merkleRoot).toBe(merkleRoot([cl.hash]));
  });

  test('cli verifies generated bundle', async () => {
    const ev = registerEvidence({
      contentHash: 'efgh',
      licenseId: 'MIT',
      source: 'src',
      transforms: [],
    });
    const cl = createClaim({
      evidenceIds: [ev.id],
      text: 'another claim',
      confidence: 0.8,
      links: [],
    });
    const manifest = buildManifest([cl.id]);
    const pack = tar.pack();
    pack.entry({ name: 'manifest.json' }, JSON.stringify(manifest));
    pack.finalize();
    const bundlePath = path.join(__dirname, 'bundle.tgz');
    await new Promise<void>((resolve) => {
      const write = fs.createWriteStream(bundlePath);
      pack.pipe(createGzip()).pipe(write);
      write.on('finish', () => resolve());
    });
    await expect(verifyBundle(bundlePath)).resolves.toBe(true);
    fs.unlinkSync(bundlePath);
  });

  test('incompatible license blocks export', () => {
    const ev = registerEvidence({
      contentHash: 'ijkl',
      licenseId: 'GPL-3.0',
      source: 'src',
      transforms: [],
    });
    const cl = createClaim({
      evidenceIds: [ev.id],
      text: 'restricted claim',
      confidence: 0.7,
      links: [],
    });
    const manifest = buildManifest([cl.id]);
    const check = checkLicenses(manifest.licenses);
    expect(check.valid).toBe(false);
    expect(check.appealCode).toBe('LIC001');
  });
});
