const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { validateRuleFile } = require('./ruleValidator');

const tmp = path.join(__dirname, '__tmp.yml');

function cleanup() {
  if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
}

test('validates a correct rule', () => {
  fs.writeFileSync(tmp, 'name: Test\nwhen: {}\nthen: {}\n');
  assert.ok(validateRuleFile(tmp).valid);
  cleanup();
});

test('returns errors for missing fields', () => {
  fs.writeFileSync(tmp, 'name: Test\nthen: {}\n');
  const result = validateRuleFile(tmp);
  assert.equal(result.valid, false);
  assert.ok(result.errors && result.errors.length > 0);
  cleanup();
});

test('handles invalid yaml', () => {
  fs.writeFileSync(tmp, 'name: [broken');
  const result = validateRuleFile(tmp);
  assert.equal(result.valid, false);
  assert.ok(result.errors && result.errors.length > 0);
  cleanup();
});
