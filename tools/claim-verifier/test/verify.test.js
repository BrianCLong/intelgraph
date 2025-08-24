import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { tmpdir } from 'os';
import crypto from 'crypto';
import { verify } from '../cli.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function makeManifest(records) {
  const sha = crypto
    .createHash('sha256')
    .update(JSON.stringify({ records }))
    .digest('hex');
  return { records, sha256: sha };
}

test('verifies manifest hash', async () => {
  const manifest = makeManifest([{ id: 1 }]);
  const file = join(tmpdir(), 'manifest.json');
  await writeFile(file, JSON.stringify(manifest));
  const res = await verify(file);
  assert.ok(res.ok);
});

test('detects mismatch', async () => {
  const manifest = { records: [{ id: 2 }], sha256: 'bad' };
  const file = join(tmpdir(), 'manifest-bad.json');
  await writeFile(file, JSON.stringify(manifest));
  const res = await verify(file);
  assert.equal(res.ok, false);
});

test('cli exits accordingly', async () => {
  const good = makeManifest([{ id: 3 }]);
  const goodFile = join(tmpdir(), 'manifest-cli.json');
  await writeFile(goodFile, JSON.stringify(good));
  await new Promise((resolve, reject) => {
    execFile(join(__dirname, '../cli.js'), [goodFile], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const bad = { records: [{ id: 4 }], sha256: 'x' };
  const badFile = join(tmpdir(), 'manifest-cli-bad.json');
  await writeFile(badFile, JSON.stringify(bad));
  await new Promise((resolve) => {
    execFile(join(__dirname, '../cli.js'), [badFile], (err) => {
      assert.ok(err); // expect non-zero exit
      resolve();
    });
  });
});
