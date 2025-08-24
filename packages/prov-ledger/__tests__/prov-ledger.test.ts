import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createManifest, verifyManifest } from '../src/index.ts';
import type { EvidenceItem, TransformStep } from '../src/index.ts';

const items: EvidenceItem[] = [
  { id: '1', uri: 'file://a', content: 'hello', license: 'MIT' },
];
const transforms: TransformStep[] = [
  { id: 't1', description: 'init', inputHash: '', outputHash: 'abc', timestamp: new Date().toISOString() },
];

test('creates and verifies manifest', () => {
  const manifest = createManifest(items, transforms);
  const report = verifyManifest({ ...manifest });
  assert.equal(report.valid, true);
});

test('detects tampering', () => {
  const manifest = createManifest(items, transforms);
  manifest.items[0].content = 'tampered';
  const report = verifyManifest(manifest);
  assert.equal(report.valid, false);
  assert.ok(report.invalidItems.includes('1'));
});
