import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  type Investigation {
    id: ID!
    title: String!
    sensitivity: String!
    status: String!
    createdAt: String!
  }

  type Query {
    investigations: [Investigation!]!
  }

  type Mutation {
    createInvestigation(title: String!, sensitivity: String!): Investigation!
  }
`;

interface Investigation {
  id: string;
  title: string;
  sensitivity: string;
  status: string;
  createdAt: string;
}

const investigations: Investigation[] = [];

export const resolvers = {
  Query: {
    investigations: () => investigations
  },
  Mutation: {
    createInvestigation: (_: unknown, { title, sensitivity }: { title: string; sensitivity: string }): Investigation => {
      const inv: Investigation = {
        id: String(investigations.length + 1),
        title,
        sensitivity,
        status: 'OPEN',
        createdAt: new Date().toISOString()
      };
      investigations.push(inv);
      return inv;
    }
  }
};
