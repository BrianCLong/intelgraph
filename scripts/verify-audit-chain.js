#!/usr/bin/env node
const { verifyAuditChain, verifyAuditChainDetailed } = require('../packages/policy-audit');

const file = process.argv[2];
if (!file) {
  console.error('Usage: verify-audit-chain <file>');
  process.exit(1);
}
const detailed = verifyAuditChainDetailed(file);
if (detailed.valid) {
  console.log('audit log verified');
  process.exit(0);
} else {
  console.error(`audit log tampered at index ${detailed.index}`);
  process.exit(1);
}
