import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { gql } from 'apollo-server-core';
import fetch from 'node-fetch';

const typeDefs = gql`
  type Document { id: ID!, title: String!, pages: Int! }
  type Query { documents: [Document!]! }
  type Mutation { processDocument(title: String!): Document! }
`;

const docs: any[] = [];

const resolvers = {
  Query: {
    documents: () => docs
  },
  Mutation: {
    async processDocument(_: any, { title }: { title: string }) {
      await fetch('http://localhost:8000/process', { method: 'POST' }).catch(() => null);
      const doc = { id: String(docs.length + 1), title, pages: 1 };
      docs.push(doc);
      return doc;
    }
  }
};

export async function createServer() {
  const app = express();
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  server.applyMiddleware({ app: app as any });
  return app;
}

if (typeof require !== 'undefined' && require.main === module) {
  createServer().then(app => {
    app.listen({ port: 4000 }, () => {
      console.log('gateway running');
    });
  });
}
