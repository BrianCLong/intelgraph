import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Document } from '../src/index.js';

test('document type', () => {
  const doc: Document = { id: '1', title: 'Sample', pages: 1 };
  assert.equal(doc.title, 'Sample');
});
