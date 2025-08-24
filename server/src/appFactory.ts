import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/index.js';
import logger from './utils/logger.js';
import sdkRouter from './routes/sdk.js';

interface AppOptions {
  lightweight?: boolean;
}

function createApp({ lightweight = false }: AppOptions = {}) {
  const app = express();
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  app.use(cors({ origin: config.cors.origin, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

  app.use('/sdk', sdkRouter);

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: config.env,
      version: '1.0.0',
    });
  });

  if (lightweight) return app;

  // In full mode, server.js wires DB + GraphQL + websockets.
  return app;
}

export { createApp };
