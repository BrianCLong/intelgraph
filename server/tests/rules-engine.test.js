const { selectorToCypher, computeScore, dedupeAlerts } = require('../src/rules/engine.js');

describe('rules engine', () => {
  test('selector to cypher translation', () => {
    const { query, params } = selectorToCypher({ label: 'Person', match: { name: 'Alice' } });
    expect(query).toBe('MATCH (n:Person) WHERE n.name = $name RETURN n');
    expect(params).toEqual({ name: 'Alice' });
  });

  test('scoring respects threshold', () => {
    const rule = {
      id: 'r1',
      watchlistId: 'w1',
      name: 'test',
      enabled: true,
      trigger: 'INGEST',
      selector: {},
      window: 60000,
      threshold: 5,
    };
    const weights = { name: 3, email: 3 };
    const data = { name: 'alice', email: 'a@example.com' };
    expect(computeScore(weights, rule, data)).toBe(6);
    const lowData = { name: 'alice' };
    expect(computeScore(weights, rule, lowData)).toBe(0);
  });

  test('dedupe merges alerts within window', () => {
    const ruleId = 'r1';
    const entityId = 'e1';
    const first = {
      id: 'a1',
      ruleId,
      entityId,
      score: 6,
      reason: ['match'],
      status: 'OPEN',
      createdAt: new Date(),
    };
    const alerts = [first];
    const second = {
      id: 'a2',
      ruleId,
      entityId,
      score: 6,
      reason: ['match'],
      status: 'OPEN',
      createdAt: new Date(),
    };
    const deduped = dedupeAlerts(alerts, second, 60 * 1000);
    expect(deduped).toHaveLength(1);
    const oldAlert = { ...first, id: 'a3', createdAt: new Date(Date.now() - 2 * 60 * 1000) };
    const deduped2 = dedupeAlerts(deduped, oldAlert, 60 * 1000);
    expect(deduped2).toHaveLength(2);
  });
});
