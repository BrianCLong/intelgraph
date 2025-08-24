export interface PolicyContext {
  role: string;
  labels: string[];
}

export interface PolicyRule {
  label: string;
  roles: string[];
}

export function isAllowed(ctx: PolicyContext, rule: PolicyRule): boolean {
  return ctx.labels.includes(rule.label) && rule.roles.includes(ctx.role);
}
