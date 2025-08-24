import { graphql } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { collabTypeDefs } from '../src/graphql/schema.collab.js';
import collabResolvers from '../src/graphql/resolvers.collab.js';

describe('collab resolvers', () => {
  it('creates a branch', async () => {
    const schema = makeExecutableSchema({ typeDefs: collabTypeDefs, resolvers: collabResolvers });
    const mutation = `mutation { createBranch(name: \"test\"){ id name } }`;
    const result = await graphql({ schema, source: mutation });
    expect(result.errors).toBeUndefined();
    expect(result.data?.createBranch.name).toBe('test');
  });
});
