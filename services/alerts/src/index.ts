import express from 'express';
import { RuleEngine } from './rule-engine';

const app = express();
app.use(express.json());

const engine = new RuleEngine();

app.post('/alerts/rules', (req, res) => {
  const rule = engine.addRule(req.body);
  res.json(rule);
});

app.post('/alerts/test', (req, res) => {
  const result = engine.evaluate(req.body);
  res.json(result);
});

app.post('/alerts/ack', (req, res) => {
  const { id, reason } = req.body;
  const alert = engine.ack(id, reason);
  res.json(alert);
});

app.post('/alerts/resolve', (req, res) => {
  const { id, reason } = req.body;
  const alert = engine.resolve(id, reason);
  res.json(alert);
});

export default app;
