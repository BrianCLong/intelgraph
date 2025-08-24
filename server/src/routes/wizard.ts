import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import WizardStubService from '../services/WizardStubService.js';

const router = express.Router();
router.use(express.json());

const service = new WizardStubService();

router.post('/perform', async (req: Request, res: Response) => {
  const input: string = req.body?.input || '';

  if (process.env.USE_REAL_HARD_CAPABILITY === 'true') {
    const real = { banner: '*** REAL MODE ENABLED ***', simulated: false };
    service.logInteraction(req.body, real);
    return res.json(real);
  }

  const response = await service.handleRequest(input);
  service.logInteraction(req.body, response);
  res.json(response);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get('/admin', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'wizard.html'));
});

router.get('/fixtures', (_req: Request, res: Response) => {
  res.json(service.getFixtures());
});

router.post('/fixtures', (req: Request, res: Response) => {
  service.setFixtures(req.body as any);
  res.json({ success: true });
});

export default router;
