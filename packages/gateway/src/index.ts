import express from 'express';
import { ApolloServer, gql } from 'apollo-server-express';
import fetch from 'node-fetch';
import { z } from 'zod';

export const typeDefs = gql`
  type Session { id: ID!, assistantId: ID!, title: String, classification: String }
  type Message { role: String!, text: String!, citations: [Citation!]! }
  type Citation { sourceType: String!, ref: String!, timestamp: String }
  type Query { _: Boolean }
  type Mutation {
    openSession(assistantId: ID!, title: String, classification: String): Session
    sendMessage(sessionId: ID!, text: String!): [Message!]!
  }
`;

const ASSIST_URL = process.env.ASSIST_URL || 'http://localhost:8000';

export const resolvers = {
  Mutation: {
    openSession: async (_: any, args: any) => {
      const res = await fetch(`${ASSIST_URL}/session/open`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ assistantId: args.assistantId, title: args.title, classification: args.classification })
      });
      return await res.json();
    },
    sendMessage: async (_: any, args: any) => {
      const res = await fetch(`${ASSIST_URL}/chat/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId: args.sessionId, text: args.text })
      });
      const data: any = await res.json();
      return data.messages;
    }
  }
};

export async function startServer() {
  const app = express();
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  server.applyMiddleware({ app: app as any });
  return new Promise<void>((resolve) => {
    app.listen({ port: 3000 }, () => resolve());
  });
}

if (require.main === module) {
  startServer();
}
