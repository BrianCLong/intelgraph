import * as fs from 'fs';
import * as path from 'path';

describe('report templates', () => {
  it('matches snapshot', () => {
    const manifestPath = path.join(
      process.cwd(),
      'templates',
      'reports',
      'sample-v1.json'
    );
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest).toMatchSnapshot();
  });
});
