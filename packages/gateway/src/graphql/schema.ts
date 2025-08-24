import { gql } from 'apollo-server-express';
import { Scene } from '../../../common-types/src';
import { canAccess } from '../../../policy/src';

const scenes: Scene[] = [];

export const typeDefs = gql`
  type Scene {
    id: ID!
    title: String!
    nodeCount: Int!
    edgeCount: Int!
  }

  type Query {
    scenes: [Scene!]!
  }

  type Mutation {
    createScene(title: String!): Scene!
  }
`;

export const resolvers = {
  Query: {
    scenes: (_: unknown, __: unknown, ctx: any) => {
      if (!canAccess(ctx.user, { tenantId: ctx.user.tenantId })) return [];
      return scenes;
    },
  },
  Mutation: {
    createScene: (_: unknown, { title }: { title: string }) => {
      const scene: Scene = { id: String(scenes.length + 1), title, nodeCount: 0, edgeCount: 0 };
      scenes.push(scene);
      return scene;
    },
  },
};
