import type { ApolloServerPlugin } from '@apollo/server';
import { evaluate } from '../services/opa';

export const makeAbacPlugin = (): ApolloServerPlugin => ({
  async requestDidStart({ request, contextValue }) {
    const ctx = contextValue as Record<string, unknown>;
    const decision = await evaluate({
      subject: String(ctx.userId ?? ''),
      action: 'graphql',
      resource: request.operationName ?? 'anonymous',
      context: {
        tenantId: ctx.tenantId,
        caseId: ctx.caseId,
        legalBasis: ctx.legalBasis,
        reason: ctx.reason,
      },
    });
    (ctx as any).obligations = decision.obligations;
    if (!decision.allow) {
      throw Object.assign(new Error('Policy denies request'), {
        code: 'FORBIDDEN',
        obligations: decision.obligations,
      });
    }
  },
});
