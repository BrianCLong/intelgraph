const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { generateGraph } = require('@intelgraph/synthdata-js');
const { runBenchmark } = require('../../benchmarks/harness');

const app = express();
app.use(express.json());

const specs = new Map();

app.post('/synth/spec', (req, res) => {
  const { seed, counts } = req.body || {};
  if (!seed) {
    return res.status(400).json({ error: 'seed required' });
  }
  const id = uuidv4();
  const spec = { id, seed, counts };
  specs.set(id, spec);
  res.json(spec);
});

app.post('/synth/generate', (req, res) => {
  const { specId, output } = req.body || {};
  const spec = specs.get(specId);
  if (!spec) {
    return res.status(404).json({ error: 'spec not found' });
  }
  const graph = generateGraph(spec);
  const outPath = output || path.join(__dirname, `graph-${specId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(graph));
  res.json({ path: outPath });
});

app.post('/bench/run', async (req, res) => {
  const result = await runBenchmark();
  res.json(result);
});

const port = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(port, () => {
    console.log(`synthdata service on ${port}`);
  });
}

module.exports = app;
