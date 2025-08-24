export interface Rule {
  subject?: Record<string, unknown>;
  resource?: Record<string, unknown>;
  action?: string;
  condition?: (ctx: EvaluationContext) => boolean;
}

export interface EvaluationContext {
  subject: Record<string, unknown>;
  resource: Record<string, unknown>;
  action: string;
}

export function evaluate(rules: Rule[], ctx: EvaluationContext): boolean {
  return rules.some((rule) => {
    if (rule.action && rule.action !== ctx.action) {
      return false;
    }
    if (rule.subject && !matches(rule.subject, ctx.subject)) {
      return false;
    }
    if (rule.resource && !matches(rule.resource, ctx.resource)) {
      return false;
    }
    if (rule.condition && !rule.condition(ctx)) {
      return false;
    }
    return true;
  });
}

function matches(expected: Record<string, unknown>, actual: Record<string, unknown>): boolean {
  return Object.entries(expected).every(([k, v]) => actual[k] === v);
}
