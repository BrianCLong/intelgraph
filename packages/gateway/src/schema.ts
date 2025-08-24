import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  type Case {
    id: ID!
    name: String!
    description: String
    status: String!
  }

  type Query {
    cases: [Case!]!
  }

  input CreateCaseInput {
    name: String!
    description: String
  }

  type Mutation {
    createCase(input: CreateCaseInput!): Case!
  }
`;

interface Case {
  id: string;
  name: string;
  description?: string;
  status: string;
}

const cases: Case[] = [];

export const resolvers = {
  Query: {
    cases: (): Case[] => cases
  },
  Mutation: {
    createCase: (
      _parent: unknown,
      { input }: { input: { name: string; description?: string } }
    ): Case => {
      const c: Case = {
        id: (cases.length + 1).toString(),
        name: input.name,
        description: input.description,
        status: 'OPEN'
      };
      cases.push(c);
      return c;
    }
  }
};
