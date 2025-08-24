#!/usr/bin/env node
import { readFile } from 'fs/promises';
import crypto from 'crypto';
import { z } from 'zod';

const manifestSchema = z.object({
  sha256: z.string(),
  records: z.array(z.any())
});

async function loadManifest(source) {
  if (/^https?:\/\//.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    return res.json();
  }
  const raw = await readFile(source, 'utf8');
  return JSON.parse(raw);
}

export async function verify(source) {
  const manifest = await loadManifest(source);
  const data = manifestSchema.parse(manifest);
  const hash = crypto.createHash('sha256').update(JSON.stringify({ records: data.records })).digest('hex');
  return { ok: hash === data.sha256, expected: data.sha256, actual: hash };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const source = process.argv[2];
  if (!source) {
    console.error('usage: claim-verifier <manifest.json|url>');
    process.exit(1);
  }
  verify(source).then((result) => {
    if (result.ok) {
      console.log('manifest verified');
      process.exit(0);
    } else {
      console.error('manifest mismatch');
      process.exit(1);
    }
  });
}
