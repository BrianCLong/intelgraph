import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import previewRouter from './routes/preview';
import executeRouter from './routes/execute';
import { logger } from './lib/logger';

const app = express();
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60_000, max: 600 }));

app.use('/copilot/preview', previewRouter);
app.use('/copilot/execute', executeRouter);

app.use((err: any, _req: any, res: any, _next: any) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'internal_error' });
});

const port = process.env.PORT || 4000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => logger.info({ port }, 'copilot listening'));
}

export default app;
