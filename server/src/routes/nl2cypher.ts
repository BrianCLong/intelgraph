import express from 'express';
import { nl2cypher } from '../nl2cypher/index';
import { executeSandbox } from '../nl2cypher/sandbox';
import { diffLines } from 'diff';
import { trace } from '@opentelemetry/api';

const router = express.Router();
const tracer = trace.getTracer('nl2cypher');

router.post('/nl2cypher', async (req, res) => {
  await tracer.startActiveSpan('nl2cypher', async (span) => {
    try {
      const { prompt } = req.body;
      const { cypher, ast, rationale, estimatedCost } = nl2cypher(prompt);
      res.json({ cypher, ast, rationale, estimatedCost });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    } finally {
      span.end();
    }
  });
});

router.post('/nl2cypher/diff', (req, res) => {
  const { original, edited } = req.body;
  const diff = diffLines(original || '', edited || '');
  res.json({ diff });
});

router.post('/sandbox/execute', async (req, res) => {
  await tracer.startActiveSpan('sandbox', async (span) => {
    try {
      const { cypher } = req.body;
      const rows = await executeSandbox(cypher);
      res.json({ rows });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    } finally {
      span.end();
    }
  });
});

export default router;
