import { Request } from 'express';
import { GraphQLError } from 'graphql';

export interface TenantContext {
  tenantId: string;
  userId?: string;
}

/**
 * TenantService resolves tenant context from requests
 */
export class TenantService {
  /**
   * Extract tenant context from HTTP request headers
   */
  static fromRequest(req: Request): TenantContext {
    const tenantId = req.headers['x-tenant-id'];
    const userId = req.headers['x-user-id'];

    if (!tenantId || Array.isArray(tenantId)) {
      throw new GraphQLError('Tenant ID is required', {
        extensions: { code: 'TENANT_REQUIRED' },
      });
    }

    return {
      tenantId: tenantId.toString(),
      userId: Array.isArray(userId) ? userId[0]?.toString() : userId?.toString(),
    };
  }
}

export default TenantService;
