import express from 'express';
import neo4j from 'neo4j-driver';
import { compile, executeSandbox } from '../../../packages/sdk/nlq-js/src/index.js';

const router = express.Router();

router.post('/nlq/compile', (req, res) => {
  const { nl } = req.body as { nl: string };
  const result = compile(nl);
  res.json(result);
});

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'neo4j://localhost',
  neo4j.auth.basic(process.env.NEO4J_USER || 'readonly', process.env.NEO4J_PASSWORD || ''),
  { disableLosslessIntegers: true },
);

router.post('/nlq/execute-sandbox', async (req, res, next) => {
  try {
    const { cypher, params } = req.body as {
      cypher: string;
      params: Record<string, unknown>;
    };
    const result = await executeSandbox(driver, cypher, params);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { router };
