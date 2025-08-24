import express from 'express';
import WorkflowEngine from './workflow.js';

const router = express.Router();
const engine = new WorkflowEngine();

router.post('/wf/definition', (req, res) => {
  engine.define(req.body.name, req.body.definition);
  res.json({ status: 'ok' });
});

router.post('/wf/start', (req, res) => {
  const { id, definition } = req.body;
  const data = engine.start(id, definition);
  res.json(data);
});

router.post('/wf/transition', (req, res) => {
  const { id, transition, reason } = req.body;
  try {
    const data = engine.transition(id, transition, reason);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/wf/cases/:id', (req, res) => {
  try {
    const data = engine.getCase(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.get('/metrics', (req, res) => {
  res.json(engine.metrics);
});

export { router as workflowRouter, engine as workflowEngine };
