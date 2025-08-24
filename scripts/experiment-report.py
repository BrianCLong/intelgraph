#!/usr/bin/env python3
"""Compute experiment lift and confidence intervals from exposure logs."""

import argparse
import json
import math
from collections import defaultdict
from typing import Dict, List


def read_log(path: str) -> Dict[str, List[dict]]:
  buckets: Dict[str, List[dict]] = defaultdict(list)
  with open(path, 'r', encoding='utf-8') as f:
    for line in f:
      line = line.strip()
      if not line:
        continue
      entry = json.loads(line)
      buckets[entry['variant']].append(entry['metrics'])
  return buckets


def compute_lift(data: Dict[str, List[dict]], metric: str) -> Dict[str, float]:
  control = [m[metric] for m in data.get('control', []) if metric in m]
  treatment = [m[metric] for m in data.get('treatment', []) if metric in m]
  n1, n2 = len(control), len(treatment)
  mean1 = sum(control) / n1 if n1 else 0.0
  mean2 = sum(treatment) / n2 if n2 else 0.0
  lift = mean2 - mean1
  var1 = sum((x - mean1) ** 2 for x in control) / (n1 - 1) if n1 > 1 else 0.0
  var2 = sum((x - mean2) ** 2 for x in treatment) / (n2 - 1) if n2 > 1 else 0.0
  se = math.sqrt(var1 / n1 + var2 / n2) if n1 and n2 else 0.0
  ci95 = 1.96 * se
  return {
      'control_mean': mean1,
      'treatment_mean': mean2,
      'lift': lift,
      'ci95': ci95,
  }


def required_sample_size(baseline: float, mde: float, power: float = 0.8, alpha: float = 0.05) -> int:
  z_alpha = 1.96  # two-sided 95%
  z_beta = 0.84   # power 0.8
  p = baseline
  q = 1 - p
  return math.ceil(2 * p * q * (z_alpha + z_beta) ** 2 / (mde ** 2))


def main() -> None:
  parser = argparse.ArgumentParser(description='Experiment report generator')
  parser.add_argument('logfile', help='Path to exposure log file')
  parser.add_argument('--metric', default='click_through_rate', help='Metric to analyze')
  parser.add_argument('--baseline', type=float, help='Baseline rate for sample size calc')
  parser.add_argument('--mde', type=float, help='Minimum detectable effect for sample size calc')
  args = parser.parse_args()

  data = read_log(args.logfile)
  stats = compute_lift(data, args.metric)
  print(json.dumps(stats, indent=2))

  if args.baseline is not None and args.mde is not None:
    n = required_sample_size(args.baseline, args.mde)
    print(f"Required sample size per variant: {n}")


if __name__ == '__main__':
  main()
