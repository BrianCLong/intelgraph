export interface PolicyContext {
  subjectId: string;
  tenantId: string;
  labels: string[];
}

export function hasLabel(ctx: PolicyContext, label: string): boolean {
  return ctx.labels.includes(label);
}

export function enforceRls<T>(rows: T[], tenantId: string, getTenant: (row: T) => string): T[] {
  return rows.filter((r) => getTenant(r) === tenantId);
}
