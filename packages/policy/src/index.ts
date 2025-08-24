export interface Context {
  purpose: string;
  sensitivity: 'LOW' | 'MED' | 'HIGH';
}

export interface Rule {
  effect: 'allow' | 'deny';
  when: (ctx: Context) => boolean;
}

export function evaluate(rules: Rule[], ctx: Context): boolean {
  for (const r of rules) {
    if (r.when(ctx)) {
      return r.effect === 'allow';
    }
  }
  return false;
}
