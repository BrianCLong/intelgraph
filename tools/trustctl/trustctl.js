#!/usr/bin/env node
const { execSync } = require('node:child_process');
const fs = require('node:fs');

const image = process.argv[2];
if (!image) {
  console.error('usage: trustctl verify <image-ref>');
  process.exit(2);
}

function run(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'inherit'] }).toString();
}

const digest = run(`crane digest ${image}`).trim();
const verify = run(`cosign verify ${image.split(':')[0]}@${digest}`);
const sbom = run(`oras manifest fetch --artifact-type application/spdx+json ${image.split(':')[0]}@${digest} || true`);

const report = {
  image,
  digest,
  cosign: verify.includes('Verified OK'),
  sbomAttached: sbom.length > 0,
  timestamp: new Date().toISOString(),
};

fs.writeFileSync('trust-verify.json', JSON.stringify(report, null, 2));
console.log(report.cosign ? 'OK: signature verified' : 'FAIL: signature missing');
process.exit(report.cosign ? 0 : 1);

