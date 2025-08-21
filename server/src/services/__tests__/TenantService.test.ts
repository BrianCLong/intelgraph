import { GraphQLError } from 'graphql';
import TenantService from '../TenantService.js';

describe('TenantService', () => {
  it('extracts tenant context from headers', () => {
    const req: any = { headers: { 'x-tenant-id': 't1', 'x-user-id': 'u1' } };
    expect(TenantService.fromRequest(req)).toEqual({ tenantId: 't1', userId: 'u1' });
  });

  it('throws when tenant header missing', () => {
    const req: any = { headers: {} };
    expect(() => TenantService.fromRequest(req)).toThrow(GraphQLError);
  });
});
