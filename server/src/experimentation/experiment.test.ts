import fs from 'fs';
import path from 'path';
import { ExperimentManager } from './index.js';

describe('ExperimentManager', () => {
  const logFile = path.join(process.cwd(), 'experiment-test.log');
  const manager = new ExperimentManager(
    path.join(process.cwd(), 'config', 'experiments.yaml'),
    logFile,
  );

  afterAll(() => {
    if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
  });

  it('assigns the same variant for the same user', () => {
    const v1 = manager.getVariant('sample-experiment', 'user-1');
    const v2 = manager.getVariant('sample-experiment', 'user-1');
    expect(v1).toBe(v2);
  });
});
