import { gql } from 'apollo-server-express';
import fetch from 'node-fetch';

export const typeDefs = gql`
  type Document {
    id: ID!
    title: String!
  }

  type SearchHit {
    documentId: ID!
    snippet: String!
  }

  type Query {
    documents: [Document!]!
    search(q: String!): [SearchHit!]!
  }
`;

export const resolvers = {
  Query: {
    documents: async () => {
      const res = await fetch(process.env.DOCSNLP_URL + '/doc/list');
      return res.json();
    },
    search: async (_: any, args: { q: string }) => {
      const res = await fetch(process.env.DOCSNLP_URL + '/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: args.q })
      });
      const data = await res.json();
      return data.hits;
    }
  }
};
