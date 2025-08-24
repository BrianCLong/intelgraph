const people: Record<string, { id: string; name: string }> = {};

export const resolvers = {
  Query: {
    node: (_: unknown, { id }: { id: string }) => people[id] || null,
  },
  Mutation: {
    upsertPerson: (_: unknown, { id, name }: { id: string; name: string }) => {
      const person = { id, name };
      people[id] = person;
      return person;
    },
  },
};
