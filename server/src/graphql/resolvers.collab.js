const branches = [];

module.exports = {
  Query: {
    branches: () => branches,
  },
  Mutation: {
    createBranch: (_, { name }) => {
      const branch = { id: String(branches.length + 1), name };
      branches.push(branch);
      return branch;
    },
  },
  Subscription: {
    presenceUpdated: {
      subscribe: (_, __, { pubsub }) => pubsub.asyncIterator('PRESENCE_UPDATED'),
    },
  },
};
