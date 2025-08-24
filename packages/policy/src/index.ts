export interface PolicyContext {
  role: string;
  license: string;
}

export interface Resource {
  license: string;
}

export function canAccess(ctx: PolicyContext, res: Resource): boolean {
  if (ctx.role === 'admin') return true;
  return ctx.license === res.license;
}
