# Experimentation Framework

This framework enables config-driven A/B tests with deterministic bucketing and exposure logging.

## Configuration

Define experiments in `config/experiments.yaml`:

```yaml
experiments:
  - id: sample-experiment
    description: Example experiment for testing new feature
    hypothesis:
      - H1: New feature increases user engagement
      - H2: Error rate does not increase
    variant_split:
      control: 50
      treatment: 50
    metrics:
      success:
        - click_through_rate
      guardrails:
        - latency_ms
        - error_rate
```

## Using the Helper Library

```ts
import { ExperimentManager } from '@/experimentation';

const manager = new ExperimentManager();
const variant = manager.getVariant('sample-experiment', userId);
manager.logExposure('sample-experiment', userId, variant, {
  latency_ms: 120,
  error_rate: 0,
  click_through_rate: 0.3,
});
```

## Reporting

Generate a report from exposure logs:

```bash
scripts/experiment-report.py experiment-exposures.log --metric click_through_rate --baseline 0.1 --mde 0.02
```

The script outputs mean values for control and treatment, lift with a 95% confidence interval, and the required sample size per variant (power=0.8, alpha=0.05).
