#!/usr/bin/env node
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createHash } = require('crypto');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { readFileSync } = require('fs');

function verify(filePath, expectedHash) {
  const file = readFileSync(filePath);
  const hash = createHash('sha256').update(file).digest('hex');
  const ok = hash === expectedHash;
  console.log(ok ? 'green' : 'red');
  return ok;
}

if (require.main === module) {
  const [,, cmd, file, hash] = process.argv;
  if (cmd === 'verify' && file && hash) {
    const ok = verify(file, hash);
    process.exit(ok ? 0 : 1);
  } else {
    console.log('Usage: report verify <file> <sha256>');
    process.exit(1);
  }
}

module.exports = { verify };
