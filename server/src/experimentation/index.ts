import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import yaml from 'js-yaml';

export interface ExperimentConfig {
  id: string;
  description: string;
  hypothesis: string[];
  variant_split: Record<string, number>;
  metrics: {
    success: string[];
    guardrails: string[];
  };
}

export class ExperimentManager {
  private experiments: ExperimentConfig[] = [];
  private logPath: string;

  constructor(
    private configPath = path.join(process.cwd(), 'config', 'experiments.yaml'),
    logFile = path.join(process.cwd(), 'experiment-exposures.log'),
  ) {
    this.logPath = logFile;
    this.loadConfig();
  }

  private loadConfig() {
    const file = fs.readFileSync(this.configPath, 'utf8');
    const parsed = yaml.load(file) as { experiments: ExperimentConfig[] };
    this.experiments = parsed.experiments || [];
  }

  getVariant(experimentId: string, userId: string): string | null {
    const exp = this.experiments.find((e) => e.id === experimentId);
    if (!exp) return null;
    const hash = crypto.createHash('sha256').update(`${experimentId}:${userId}`).digest('hex');
    const num = parseInt(hash.slice(0, 8), 16) % 100;
    let cumulative = 0;
    for (const [variant, weight] of Object.entries(exp.variant_split)) {
      cumulative += weight;
      if (num < cumulative) return variant;
    }
    return null;
  }

  logExposure(
    experimentId: string,
    userId: string,
    variant: string,
    metrics: Record<string, number>,
  ) {
    const entry = {
      ts: new Date().toISOString(),
      experimentId,
      userId,
      variant,
      metrics,
    };
    fs.appendFileSync(this.logPath, `${JSON.stringify(entry)}\n`);
  }
}
