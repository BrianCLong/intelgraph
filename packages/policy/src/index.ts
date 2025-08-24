export interface Context {
  tenantId: string
  role: string
  purpose?: string
}

export interface PolicyRule {
  role: string
  resource: string
  action: string
}

export function can(ctx: Context, rule: PolicyRule): boolean {
  return ctx.role === rule.role
}
