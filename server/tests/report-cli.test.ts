import * as path from 'path';
import * as fs from 'fs';
import { createHash } from 'crypto';
const { verify } = require('../../tools/report-cli');

describe('report cli', () => {
  it('verifies hash correctly', () => {
    const file = path.join(
      process.cwd(),
      'templates',
      'reports',
      'sample.handlebars'
    );
    const data = fs.readFileSync(file);
    const hash = createHash('sha256').update(data).digest('hex');
    expect(verify(file, hash)).toBe(true);
  });
});
