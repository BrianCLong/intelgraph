import { EventEmitter } from 'events';
import { GraphQLError } from 'graphql';

export type QuotaType = 'ingest' | 'storage' | 'jobs' | 'api';

export interface QuotaDefinition {
  limit: number;
}

export interface QuotaWarning {
  warning: true;
  remaining: number;
}

export interface UsageEvent {
  tenantId: string;
  type: QuotaType;
  amount: number;
}

/**
 * UsageEmitter emits metering events for billing aggregation
 */
export class UsageEmitter extends EventEmitter {
  emitUsage(event: UsageEvent): void {
    this.emit('usage', event);
  }
}

export const usageEmitter = new UsageEmitter();

/**
 * QuotaService enforces per-tenant quotas
 */
export class QuotaService {
  private quotas: Map<string, Record<QuotaType, QuotaDefinition>> = new Map();
  private usage: Map<string, Record<QuotaType, number>> = new Map();

  setQuota(tenantId: string, def: Partial<Record<QuotaType, number>>): void {
    const existing = this.quotas.get(tenantId) || ({} as Record<QuotaType, QuotaDefinition>);
    (Object.keys(def) as QuotaType[]).forEach((type) => {
      existing[type] = { limit: def[type]! };
    });
    this.quotas.set(tenantId, existing);
  }

  /**
   * record usage for a tenant and enforce quota
   */
  recordUsage(tenantId: string, type: QuotaType, amount: number): QuotaWarning | void {
    const quota = this.quotas.get(tenantId)?.[type];
    if (!quota) return;

    const tenantUsage = this.usage.get(tenantId) || ({} as Record<QuotaType, number>);
    tenantUsage[type] = (tenantUsage[type] || 0) + amount;
    this.usage.set(tenantId, tenantUsage);

    usageEmitter.emitUsage({ tenantId, type, amount });

    if (tenantUsage[type] > quota.limit) {
      throw new GraphQLError('Quota exceeded', {
        extensions: { code: 'QUOTA_EXCEEDED', type },
      });
    }

    const remaining = quota.limit - tenantUsage[type];
    if (remaining <= quota.limit * 0.1) {
      return { warning: true, remaining };
    }
  }
}

export default QuotaService;
