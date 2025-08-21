import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import evidenceRouter from './routes/evidence';
import claimsRouter from './routes/claims';
import exportRouter from './routes/export';
import { logger } from './lib/logger';

const app = express();
app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(rateLimit({ windowMs: 60_000, max: 600 }));

app.use('/evidence', evidenceRouter);
app.use('/claims', claimsRouter);
app.use('/bundles', exportRouter);

app.use((err: any, _req: any, res: any, _next: any) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'internal_error' });
});

const port = process.env.PORT || 4001;
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => logger.info({ port }, 'prov-ledger listening'));
}

export default app;
