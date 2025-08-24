import { Router } from 'express';
import { GAReleaseService } from '../services/GAReleaseService';

const router = Router();
const gaReleaseService = new GAReleaseService();

/**
 * GET /api/ga-release/info
 * Get current GA release information
 */
router.get('/info', async (req, res) => {
  try {
    const releaseInfo = await gaReleaseService.getReleaseInfo();

    res.json({
      success: true,
      data: releaseInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get release info',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/ga-release/status
 * Get deployment readiness status
 */
router.get('/status', async (req, res) => {
  try {
    const deploymentStatus = await gaReleaseService.validateDeployment();

    res.json({
      success: true,
      data: deploymentStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to validate deployment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/ga-release/generate-sbom
 * Generate Software Bill of Materials
 */
router.post('/generate-sbom', async (req, res) => {
  try {
    const result = await gaReleaseService.generateSBOM();

    if (result.success) {
      res.json({
        success: true,
        data: {
          path: result.path,
          message: 'SBOM generated successfully',
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'SBOM generation failed',
        message: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'SBOM generation error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/ga-release/preflight
 * Run preflight checks
 */
router.post('/preflight', async (req, res) => {
  try {
    const result = await gaReleaseService.runPreflight();

    res.json({
      success: result.success,
      data: {
        results: result.results,
        overall: result.success ? 'pass' : 'fail',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Preflight check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/ga-release/health
 * Health check for GA release service
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ga-release',
    version: '1.0.0-ga',
    features: ['release-info', 'deployment-validation', 'sbom-generation', 'preflight-checks'],
    timestamp: new Date().toISOString(),
  });
});

export default router;
