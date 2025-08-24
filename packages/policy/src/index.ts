export interface UserContext {
  userId: string;
  roles: string[];
  tenantId: string;
}

export interface ResourceContext {
  tenantId: string;
  sensitivity?: string;
}

export function canAccess(user: UserContext, resource: ResourceContext): boolean {
  if (user.tenantId !== resource.tenantId) return false;
  if (resource.sensitivity === 'HIGH' && !user.roles.includes('ADMIN')) return false;
  return true;
}
