export interface Context {
  role: string;
  tenantId: string;
}

export function canAccess(ctx: Context, requiredRole: string): boolean {
  const roles = ['VIEWER', 'ANALYST', 'ML_ENGINEER', 'ADMIN', 'OWNER'];
  return roles.indexOf(ctx.role) >= roles.indexOf(requiredRole);
}
