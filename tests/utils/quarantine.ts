import { test as base } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Load the list of quarantined flaky tests
const flakyTestsPath = path.join(process.cwd(), '.ci/flaky-tests.json');
let flakey = new Set<string>();

try {
  if (fs.existsSync(flakyTestsPath)) {
    const flakyTests = JSON.parse(fs.readFileSync(flakyTestsPath, 'utf8'));
    flakey = new Set(flakyTests);
  }
} catch (error) {
  console.warn('Could not load flaky tests list:', error);
}

export const test = base.extend({});

// Quarantined test runner - skips tests that are in the flaky list
export const itq = (name: string, fn: () => Promise<void>) => {
  if (flakey.has(name)) {
    test.skip(true, 'quarantined flaky test');
  } else {
    test(name, fn);
  }
};

// Export for normal tests too
export { expect } from '@playwright/test';
