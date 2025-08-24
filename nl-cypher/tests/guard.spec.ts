import { validateQuery, loadSafeList } from '../src/validator.ts';

const safe = loadSafeList();

describe('guard patterns', () => {
  test('rejects long variable length paths', () => {
    const warnings = validateQuery('MATCH (n)-[*6]->(m) RETURN m', safe);
    expect(warnings).toContain('path length over 5');
  });
});
