import { translator } from '../../src/services/nlq/translator';

describe('NLQTranslator', () => {
  it('translates person queries with tenant scoping', async () => {
    const res = await translator.translate('Show all people', 't1');
    expect(res.cypher).toContain('MATCH (n:Person)');
    expect(res.cypher).toContain('n.tenantId = $tenantId');
    expect(res.params.tenantId).toBe('t1');
  });
});
