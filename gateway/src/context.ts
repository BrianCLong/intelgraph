import type { ExpressContextFunctionArgument } from '@apollo/server/express4';

export interface RequestContext {
  tenantId: string;
  caseId?: string;
  userId: string;
  legalBasis?: string;
  reason?: string;
  obligations: unknown[];
}

export async function buildContext({
  req,
}: ExpressContextFunctionArgument): Promise<RequestContext> {
  const headers = req.headers as Record<string, string | undefined>;
  return {
    tenantId: headers['x-tenant-id'] ?? '',
    caseId: headers['x-case-id'],
    userId: headers['x-user-id'] ?? '',
    legalBasis: headers['x-legal-basis'],
    reason: headers['x-reason'],
    obligations: [],
  };
}
