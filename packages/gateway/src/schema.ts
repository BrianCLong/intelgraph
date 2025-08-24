import { ApolloServer, gql } from 'apollo-server-express';
import express from 'express';
import fetch from 'node-fetch';

const typeDefs = gql`
  type Alert {
    id: ID!
    kind: String!
    score: Float!
  }
  type Query {
    alerts: [Alert!]!
  }
`;

const resolvers = {
  Query: {
    alerts: async () => {
      const res = await fetch('http://finintel:8000/alerts');
      const data = await res.json();
      return data.alerts;
    }
  }
};

export async function createServer() {
  const app = express();
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  server.applyMiddleware({ app });
  return app;
}
