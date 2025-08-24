import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { tmpdir } from 'os';
import crypto from 'crypto';
import http from 'http';
import { verify } from '../cli.js';

test('verifies manifest hash', async () => {
  const records = [{ id: 1 }];
  const sha = crypto.createHash('sha256').update(JSON.stringify({ records })).digest('hex');
  const manifest = { records, sha256: sha };
  const file = join(tmpdir(), 'manifest.json');
  await writeFile(file, JSON.stringify(manifest));
  const res = await verify(file);
  assert.ok(res.ok);
});

test('cli binary exits 0', async () => {
  const records = [{ id: 2 }];
  const sha = crypto.createHash('sha256').update(JSON.stringify({ records })).digest('hex');
  const manifest = { records, sha256: sha };
  const file = join(tmpdir(), 'manifest-cli.json');
  await writeFile(file, JSON.stringify(manifest));
  const __dirname = dirname(fileURLToPath(import.meta.url));
  await new Promise((resolve, reject) => {
    execFile(join(__dirname, '../cli.js'), [file], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
});

test('verifies manifest via url', async () => {
  const records = [{ id: 3 }];
  const sha = crypto.createHash('sha256').update(JSON.stringify({ records })).digest('hex');
  const manifest = { records, sha256: sha };
  const server = http.createServer((_, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(manifest));
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const url = `http://localhost:${port}/manifest.json`;
  const res = await verify(url);
  assert.ok(res.ok);
  server.close();
});
