#!/usr/bin/env node
import { readFile } from 'fs/promises';
import crypto from 'crypto';
import { z } from 'zod';

const manifestSchema = z.object({
  sha256: z.string(),
  records: z.array(z.any())
});

export async function verify(filePath) {
  const raw = await readFile(filePath, 'utf8');
  const manifest = JSON.parse(raw);
  const data = manifestSchema.parse(manifest);
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ records: data.records }))
    .digest('hex');
  return { ok: hash === data.sha256, expected: data.sha256, actual: hash };
}

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: claim-verifier <manifest.json>');
    process.exit(1);
  }
  verify(file).then((result) => {
    if (result.ok) {
      console.log(green('manifest verified'));
      process.exit(0);
    } else {
      console.error(red('manifest mismatch'));
      process.exit(1);
    }
  });
}
