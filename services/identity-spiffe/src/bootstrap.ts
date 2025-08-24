/**
 * Bootstrap for SPIFFE identity service.
 */

import express from 'express';
import { router } from './controller.js';

export function createServer() {
  const app = express();
  app.use('/identity', router);
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = createServer();
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`identity-spiffe service running on port ${port}`);
  });
}
