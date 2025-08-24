const express = require('express');
const config = require('./config');
const logger = require('./logger');

const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

let server;
if (require.main === module) {
  server = app.listen(config.port, () => {
    logger.info({ event: 'server_start', port: config.port }, 'server started');
  });

  const shutdown = () => {
    logger.info('shutting down');
    server.close(() => {
      logger.info('shutdown complete');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = app;
