#!/usr/bin/env node
const fs = require('fs');
let ok = true;
const dirs = process.argv.slice(2);
if (dirs.length === 0) {
  console.warn('No coverage directories provided');
  process.exit(0);
}
for (const dir of dirs) {
  const file = `${dir}/coverage-summary.json`;
  if (!fs.existsSync(file)) {
    console.error(`Missing coverage summary for ${dir}`);
    ok = false;
    continue;
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const pct = data.total.lines.pct;
  if (pct < 90) {
    console.error(`Coverage for ${dir} is ${pct}% (<90%)`);
    ok = false;
  }
}
process.exit(ok ? 0 : 1);
