import { GraphQLError } from 'graphql';
import QuotaService, { usageEmitter } from '../QuotaService.js';

describe('QuotaService', () => {
  it('emits usage events and warns near limit', () => {
    const svc = new QuotaService();
    svc.setQuota('t1', { ingest: 100 });
    const events: any[] = [];
    usageEmitter.on('usage', (e) => events.push(e));
    const warn = svc.recordUsage('t1', 'ingest', 95);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ tenantId: 't1', type: 'ingest', amount: 95 });
    expect(warn).toEqual({ warning: true, remaining: 5 });
  });

  it('throws when quota exceeded', () => {
    const svc = new QuotaService();
    svc.setQuota('t1', { storage: 10 });
    expect(() => svc.recordUsage('t1', 'storage', 11)).toThrow(GraphQLError);
  });
});
