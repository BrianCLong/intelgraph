import fs from 'fs';
import path from 'path';
import { compile } from '../../packages/sdk/nlq-js/src/index.js';

describe('nlq compile', () => {
  const fixturePath = path.join(__dirname, '../../tests/fixtures/nlq/golden.json');
  const fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  it('matches golden fixtures', () => {
    for (const { nl, cypher, params } of fixtures) {
      const result = compile(nl);
      expect(result.cypher).toBe(cypher);
      expect(result.params).toEqual(params);
    }
  });

  it('rejects write operations', () => {
    expect(() => compile('delete all nodes')).toThrow('write operations are not allowed');
  });
});
