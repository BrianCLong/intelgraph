import express, { Request, Response } from 'express';

const router = express.Router();

/**
 * Health check for SDK service
 */
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

/**
 * Publish a new SDK version. Currently a stub that validates input and
 * acknowledges the request. Integration with the actual SDK generator will
 * be added later.
 */
router.post('/publish', (req: Request, res: Response) => {
  const { language, version } = req.body as {
    language?: string;
    version?: string;
  };

  if (!language || !version) {
    return res.status(400).json({ error: 'language and version are required' });
  }

  // TODO: integrate with SDK generation pipeline
  res.status(202).json({
    message: 'SDK publish request accepted',
    language,
    version,
  });
});

export default router;
