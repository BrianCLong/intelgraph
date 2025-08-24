import { planFederatedQuery } from '../services/federation/index.js';

describe('planFederatedQuery', () => {
  it('creates subqueries for each enclave', () => {
    const plan = planFederatedQuery('MATCH (n) RETURN n', ['alpha', 'beta']);
    expect(plan.subqueries.alpha).toBe('MATCH (n) RETURN n');
    expect(plan.subqueries.beta).toBe('MATCH (n) RETURN n');
  });
});
