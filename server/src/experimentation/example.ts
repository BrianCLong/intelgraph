import { ExperimentManager } from './index.js';

const manager = new ExperimentManager();

const userId = 'user-123';
const experimentId = 'sample-experiment';
const variant = manager.getVariant(experimentId, userId);

if (variant) {
  // pretend we measured metrics
  const metrics = { latency_ms: 120, error_rate: 0, click_through_rate: 0.3 };
  manager.logExposure(experimentId, userId, variant, metrics);
  console.log(`User ${userId} in ${variant}`);
} else {
  console.log('Experiment not found');
}
