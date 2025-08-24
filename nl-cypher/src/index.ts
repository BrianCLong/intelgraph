import Fastify from 'fastify';
import neo4j from 'neo4j-driver';
import { LlmRouter } from './Engines/LlmRouter.ts';
import { translate } from './translator.ts';
import { execute } from './executor.ts';

const fastify = Fastify();
const router = new LlmRouter(process.env.OPENAI_API_KEY || '');
const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'test')
);

fastify.post('/translate', async (req, reply) => {
  const body = req.body as { text?: string };
  const text = body.text || '';
  const result = await translate(text, router);
  return result;
});

fastify.post('/execute', async (req, reply) => {
  const body = req.body as { cypher?: string; ticket?: string };
  const cypher = body.cypher || '';
  const ticket = body.ticket || '';
  const res = await execute(cypher, ticket, driver);
  return { rows: res };
});

export default fastify;
