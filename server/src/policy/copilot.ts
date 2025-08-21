export interface CopilotPolicyDecision {
  allowed: boolean;
  reason: string;
  deniedRules: string[];
}

export function evaluateCopilotPolicy(cypher: string, tenantId: string): CopilotPolicyDecision {
  const deniedRules: string[] = [];
  if (/\bDELETE\b|\bDETACH\b/i.test(cypher)) {
    deniedRules.push('no_destructive_ops');
  }
  if (!/tenantId\s*:\s*\$tenantId|tenantId\s*=\s*\$tenantId/i.test(cypher)) {
    deniedRules.push('missing_tenant_scope');
  }
  return {
    allowed: deniedRules.length === 0,
    reason: deniedRules.length === 0 ? 'allow' : 'Policy violation',
    deniedRules,
  };
}
