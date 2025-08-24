export interface Rule {
  field: string;
  equals: string;
}

export interface Context {
  [key: string]: string;
}

export function evaluate(rules: Rule[], ctx: Context): boolean {
  return rules.every(r => ctx[r.field] === r.equals);
}
