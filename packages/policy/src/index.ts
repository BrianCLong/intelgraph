export interface Context {
  role: string;
  attributes: Record<string, string>;
}

export interface PolicyRule {
  attribute: string;
  equals: string;
}

export function evaluate(rules: PolicyRule[], ctx: Context): boolean {
  return rules.every(r => ctx.attributes[r.attribute] === r.equals);
}

export function rlsBootstrap(tenantId: string): string {
  return `ALTER DATABASE SET app.tenant_id = '${tenantId}';`;
}
