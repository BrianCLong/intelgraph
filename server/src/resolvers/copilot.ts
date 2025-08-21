import { getNeo4jDriver } from '../db/neo4j';
import { wrapResolversWithPolicy } from './policyWrapper';
import { translator } from '../services/nlq/translator';
import { evaluateCopilotPolicy } from '../policy/copilot';

const resolvers = {
  Query: {
    async copilotQuery(
      _: any,
      { question, caseId, preview = true }: { question: string; caseId: string; preview?: boolean },
      ctx: any,
    ) {
      const tenantId = ctx?.tenant?.id || 'default';
      const start = Date.now();
      try {
        const { cypher, citations } = await translator.translate({ question, caseId, tenantId });
        const policy = evaluateCopilotPolicy(cypher, tenantId);

        let executedCypher: string | null = null;
        if (!preview && policy.allowed) {
          const driver = getNeo4jDriver();
          const session = driver.session();
          try {
            await session.run(cypher, { tenantId });
            executedCypher = cypher;
          } finally {
            await session.close();
          }
        }

        const latencyMs = Date.now() - start;
        return {
          preview: cypher,
          cypher: executedCypher,
          citations,
          redactions: [],
          policy,
          metrics: { latencyMs },
        };
      } catch (err: any) {
        const latencyMs = Date.now() - start;
        return {
          preview: '',
          cypher: null,
          citations: [],
          redactions: [],
          policy: { allowed: false, reason: err?.message || 'internal error', deniedRules: [] },
          metrics: { latencyMs },
        };
      }
    },
  },
};

export const CopilotResolvers = wrapResolversWithPolicy('Copilot', resolvers);
