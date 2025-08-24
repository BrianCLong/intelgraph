export interface PolicyRule {
  subject: string;
  action: string;
  resource: string;
}

export function isAllowed(rules: PolicyRule[], action: string, resource: string, subject: string): boolean {
  return rules.some((r) => r.action === action && r.resource === resource && r.subject === subject);
}
