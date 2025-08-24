import { Router } from 'express';
import { CopilotNLQueryService } from '../services/CopilotNLQueryService';

const router = Router();
const copilotService = new CopilotNLQueryService();

/**
 * POST /api/copilot/nl-to-cypher
 * Preview endpoint for natural language to Cypher translation
 */
router.post('/nl-to-cypher', async (req, res) => {
  try {
    const { query, context } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    const result = await copilotService.translateToVypher({ query, context });
    
    res.json({
      success: true,
      data: result,
      preview: true,
      message: 'This is a preview implementation - full NL→Cypher coming post-GA'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Translation failed',
      preview: true,
      message: 'Preview mode error handling'
    });
  }
});

/**
 * GET /api/copilot/health
 * Health check for Copilot service
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'copilot-preview',
    features: ['nl-to-cypher'],
    preview: true
  });
});

export default router;