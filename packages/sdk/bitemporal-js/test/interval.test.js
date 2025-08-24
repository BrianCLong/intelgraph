const { test } = require('node:test');
const assert = require('node:assert');
const { intersect, contains } = require('../src/interval');

test('intersects overlapping intervals', () => {
  const a = { from: new Date('2020-01-01'), to: new Date('2020-06-01') };
  const b = { from: new Date('2020-03-01'), to: new Date('2020-09-01') };
  assert.deepStrictEqual(intersect(a, b), {
    from: new Date('2020-03-01'),
    to: new Date('2020-06-01')
  });
});

test('returns null for disjoint intervals', () => {
  const a = { from: new Date('2020-01-01'), to: new Date('2020-02-01') };
  const b = { from: new Date('2020-03-01'), to: new Date('2020-04-01') };
  assert.strictEqual(intersect(a, b), null);
});

test('handles open-ended intervals', () => {
  const a = { from: new Date('2020-01-01'), to: null };
  const b = { from: new Date('2020-03-01'), to: new Date('2020-04-01') };
  const res = intersect(a, b);
  assert.deepStrictEqual(res, {
    from: new Date('2020-03-01'),
    to: new Date('2020-04-01')
  });
  assert.strictEqual(contains(res, new Date('2020-03-15')), true);
});
