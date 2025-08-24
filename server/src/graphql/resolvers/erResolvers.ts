/**
 * Resolver stubs for Entity Resolution GraphQL operations
 */
export const erResolvers = {
  Query: {
    erPair: async (_parent: unknown, args: { id: string }) => {
      return {
        id: args.id,
        leftId: '',
        rightId: '',
        score: 0,
        decision: null
      };
    }
  },
  Mutation: {
    labelPair: async (
      _parent: unknown,
      args: { id: string; decision: string }
    ) => {
      return { id: args.id, leftId: '', rightId: '', score: 0, decision: args.decision };
    }
  }
};

export default erResolvers;

