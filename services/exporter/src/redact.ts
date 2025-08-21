export interface RedactRule {
  field: string;
  action: 'drop' | 'mask';
}

export const applyRedactions = (
  data: Record<string, unknown>[],
  rules: RedactRule[],
  log: string[],
): Record<string, unknown>[] => {
  return data.map((item) => {
    const clone: Record<string, unknown> = JSON.parse(JSON.stringify(item));
    for (const rule of rules) {
      if (
        rule.action === 'drop' &&
        Object.prototype.hasOwnProperty.call(clone, rule.field)
      ) {
        delete clone[rule.field];
        log.push(`drop:${rule.field}`);
      } else if (
        rule.action === 'mask' &&
        Object.prototype.hasOwnProperty.call(clone, rule.field)
      ) {
        clone[rule.field] = 'REDACTED';
        log.push(`mask:${rule.field}`);
      }
    }
    return clone;
  });
};
