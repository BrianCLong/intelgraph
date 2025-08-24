const briefResolvers = {
  Query: {
    brief: (_: unknown, { id }: { id: string }) => ({ id, title: 'Draft' }),
  },
  Mutation: {},
};

export default briefResolvers;
