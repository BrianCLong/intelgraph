const express = require('express');
const crypto = require('crypto');

function createApp() {
  const app = express();
  app.use(express.json());

  let lastHash = '';

  app.post('/bt/read', (req, res) => {
    const { query, params, asOfValid, asOfTx } = req.body;
    res.json({ query, params, asOfValid, asOfTx });
  });

  app.post('/bt/diff', (req, res) => {
    const { before = [], after = [] } = req.body;
    const added = after.filter((x) => !before.includes(x));
    const removed = before.filter((x) => !after.includes(x));
    const changed = after.filter(
      (x) => before.includes(x) && before.find((b) => b === x) !== x
    );
    res.json({ added, removed, changed });
  });

  app.post('/bt/snapshot', (req, res) => {
    const data = JSON.stringify(req.body);
    const hash = crypto.createHash('sha256').update(lastHash + data).digest('hex');
    lastHash = hash;
    res.json({ hash });
  });

  app.post('/bt/restore', (_req, res) => {
    res.json({ restored: true });
  });

  return app;
}

module.exports = { createApp };
