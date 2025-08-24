import assert from 'node:assert/strict';
import { configure, score } from './index.js';

assert.equal(typeof configure, 'function');
assert.equal(typeof score, 'function');
