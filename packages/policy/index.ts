export interface Context {
  tenantId: string;
  role: string;
}

export function allow(ctx: Context, tenantId: string) {
  return ctx.tenantId === tenantId;
}
