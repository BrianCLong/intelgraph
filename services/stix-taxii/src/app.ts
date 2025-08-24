import express from 'express';
import { normalizeIOC } from '../../packages/sdk/ioc-normalizer-js/src/index.js';
import { StixTaxiiClient } from './client.js';

export function createApp() {
  const app = express();
  app.use(express.json());

  app.post('/taxii/pull', async (req, res) => {
    try {
      const { baseUrl, collection, cursor, token } = req.body || {};
      const client = new StixTaxiiClient({ baseUrl, collection, token });
      const result = await client.pull(cursor);
      // Emit to canonical topic (placeholder)
      // console.log('emit ingest.canonical.v1', result.items);
      res.json({ collections: result.collections, itemsIngested: result.itemsIngested, cursor: result.cursor });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/ioc/normalize', (req, res) => {
    const { ioc, source } = req.body || {};
    const normalized = normalizeIOC(ioc, source);
    if (!normalized) {
      return res.status(400).json({ error: 'Invalid IOC' });
    }
    res.json(normalized);
  });

  return app;
}
