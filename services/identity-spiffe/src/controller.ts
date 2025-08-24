/**
 * SPIFFE identity controller
 * Provides endpoints for SVID issuance and revocation.
 */

import express from 'express';

export const router = express.Router();

/**
 * Health check for the identity service.
 */
router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

/**
 * Placeholder for SVID issuance.
 * TODO: integrate with SPIRE server to mint SVIDs for workloads.
 */
router.post('/svid', (_req, res) => {
  res.status(501).json({ error: 'not implemented' });
});
