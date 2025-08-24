import fs from 'node:fs';
import path from 'node:path';

test('supergraph SDL is present', () => {
  const p = path.join(__dirname, '../supergraph/supergraph.graphql');
  const sdl = fs.readFileSync(p, 'utf8');
  expect(sdl).toContain('schema');
});
