import { evaluate } from './opa';

export const resolvers = {
  Query: {
    claim: () => null,
    evidence: () => null,
    searchNodes: () => [],
  },
  Mutation: {
    createEvidence: () => {
      throw new Error('not_implemented');
    },
    createClaim: () => {
      throw new Error('not_implemented');
    },
    exportBundle: async (_: any, { id }: any, context: any) => {
      const result = await evaluate('intelgraph/exports', { id, user: context?.user });
      if (!result.allow) {
        throw new Error('forbidden');
      }
      return 'todo';
    },
  },
};
