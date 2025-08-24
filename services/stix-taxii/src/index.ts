import { createServer } from 'http';
import { createApp } from './app.js';

const PORT = process.env.PORT || 5000;

async function start() {
  const app = createApp();
  const server = createServer(app);
  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`STIX/TAXII service listening on ${PORT}`);
  });
}

start();
