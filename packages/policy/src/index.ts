export interface Context {
  role: string
  attributes: Record<string, string>
}

export function allow(ctx: Context, rule: { role?: string; attr?: [string, string] }): boolean {
  if (rule.role && rule.role !== ctx.role) return false
  if (rule.attr) {
    const [k, v] = rule.attr
    if (ctx.attributes[k] !== v) return false
  }
  return true
}
