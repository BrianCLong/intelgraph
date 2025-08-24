#!/usr/bin/env node
import fs from 'fs';
import tar from 'tar-stream';
import { createGunzip } from 'zlib';
import { merkleRoot, Manifest, verifyClaim } from './ledger';

async function readManifest(path: string): Promise<Manifest> {
  const extract = tar.extract();
  const gunzip = createGunzip();
  const stream = fs.createReadStream(path);
  return new Promise((resolve, reject) => {
    let manifest = '';
    extract.on('entry', (header, streamEntry, next) => {
      if (header.name === 'manifest.json') {
        streamEntry.on('data', (d) => (manifest += d.toString()));
        streamEntry.on('end', () => next());
        streamEntry.on('error', reject);
      } else {
        streamEntry.resume();
        streamEntry.on('end', next);
      }
    });
    extract.on('finish', () => {
      try {
        resolve(JSON.parse(manifest));
      } catch (err) {
        reject(err);
      }
    });
    stream.pipe(gunzip).pipe(extract);
  });
}

export async function verifyBundle(path: string): Promise<boolean> {
  const manifest = await readManifest(path);
  for (const claim of manifest.claims) {
    if (!verifyClaim(claim)) {
      throw new Error(`Claim ${claim.id} failed verification`);
    }
  }
  const computedRoot = merkleRoot(manifest.claims.map((c) => c.hash));
  if (computedRoot !== manifest.merkleRoot) {
    throw new Error('Merkle root mismatch');
  }
  return true;
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: prov-verify <bundle.tgz>');
    process.exit(1);
  }
  try {
    await verifyBundle(file);
    console.log('OK');
  } catch (err) {
    console.error('Verification failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
