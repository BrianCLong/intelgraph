import { copilotResolvers } from '../src/graphql/resolvers.copilot.js';

describe('copilotQuery resolver', () => {
  const makeContext = (policyAllow = true) => {
    return {
      tenant: { id: 't1' },
      neo4jSession: {
        run: jest
          .fn()
          .mockResolvedValue({ summary: { plan: { operatorType: 'Projection' } }, records: [] }),
      },
      policyService: {
        evaluate: jest
          .fn()
          .mockResolvedValue(
            policyAllow
              ? { allow: true }
              : { allow: false, reason: 'blocked', deniedRules: ['rule'] },
          ),
      },
    };
  };

  it('executes query when allowed', async () => {
    const ctx = makeContext(true);
    const res = await copilotResolvers.Query.copilotQuery(
      null,
      { question: 'Show all people', caseId: 'c1', preview: false },
      ctx,
    );
    expect(ctx.neo4jSession.run).toHaveBeenCalledWith(
      expect.stringContaining('EXPLAIN'),
      expect.any(Object),
    );
    expect(res.cypher).toContain('MATCH');
    expect(res.policy.allowed).toBe(true);
  });

  it('returns policy denial without executing', async () => {
    const ctx = makeContext(false);
    const res = await copilotResolvers.Query.copilotQuery(
      null,
      { question: 'Show all people', caseId: 'c1', preview: false },
      ctx,
    );
    expect(res.cypher).toBeNull();
    expect(res.policy.allowed).toBe(false);
    expect(res.policy.deniedRules).toContain('rule');
  });
});
