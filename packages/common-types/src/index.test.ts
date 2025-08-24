import { Host, Indicator, Rule, schemas } from './index';

describe('entity schemas', () => {
  it('creates a valid Host', () => {
    const host: Host = {
      id: 'h1',
      hostname: 'web1',
      ip: '10.0.0.5',
      os: 'linux',
      assetCriticality: 'medium',
      policyLabels: [],
    };
    expect(host.hostname).toBe('web1');
  });

  it('contains enum values in schema', () => {
    const indicator: Indicator = {
      id: 'i1',
      type: 'ip',
      value: '8.8.8.8',
      labels: [],
      sources: [],
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      policyLabels: [],
    };
    const rule: Rule = {
      id: 'r1',
      kind: 'SIGMA',
      name: 'test',
      version: '1',
      source: 'local',
      enabled: true,
      severity: 'low',
      tags: [],
      content: 'rule',
      policyLabels: [],
    };
    expect(indicator.type).toBe('ip');
    expect(rule.kind).toBe('SIGMA');
    expect(schemas.Indicator.properties.type.enum).toContain('ip');
    expect(schemas.Rule.properties.kind.enum).toContain('SIGMA');
  });
});
