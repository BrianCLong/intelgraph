import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import fetch from 'node-fetch';
import { typeDefs } from './graphql/schema';

const resolvers = {
  Query: {
    async search(_: unknown, args: { query: string; k?: number }) {
      const res = await fetch('http://localhost:8000/retrieve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: args.query, k: args.k ?? 5 })
      });
      return res.json();
    },
    async askPreview(_: unknown, args: { question: string }) {
      const res = await fetch('http://localhost:8000/retrieve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: args.question, k: 3 })
      });
      const results = await res.json();
      const summary = results.map((r: any) => r.snippet.split('.')[0]);
      return { question: args.question, answerDraft: summary, citations: [] };
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

if (require.main === module) {
  createServer().then(app => {
    app.listen(3000, () => {
      console.log('Gateway running on http://localhost:3000');
    });
  });
}
