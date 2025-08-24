import { describe, expect, it } from '@jest/globals';
import { envelopeSchema } from './types.js';

describe('envelopeSchema', () => {
  it('validates a basic envelope', () => {
    const result = envelopeSchema.parse({
      tenantId: 't1',
      source: { name: 'test' },
      kind: 'ENTITY',
      type: 'Person',
      payload: {},
      observedAt: new Date().toISOString(),
      hash: 'abc',
      policyLabels: [],
      provenance: { chain: [] },
    });
    expect(result.tenantId).toBe('t1');
  });
});
