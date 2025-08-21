import fs from 'fs';
import yaml from 'js-yaml';

interface DQRule {
  field: string;
  required?: boolean;
  unique?: boolean;
  pattern?: string;
  min?: number;
  max?: number;
}

interface DQFailure {
  index: number;
  field: string;
  reason: string;
}

interface DQResult {
  passRate: number;
  failures: DQFailure[];
}

class DataQualityService {
  private rulesets: Record<string, DQRule[]> = {};
  private results: Record<string, DQResult> = {};

  upsertRuleset(sourceId: string, rules: DQRule[]): void {
    this.rulesets[sourceId] = rules;
  }

  getStatus(sourceId: string): DQResult {
    return this.results[sourceId] || { passRate: 1, failures: [] };
  }

  validate(sourceId: string, records: Record<string, any>[]): DQResult {
    const rules = this.rulesets[sourceId] || [];
    const failures: DQFailure[] = [];
    const uniques: Record<string, Set<any>> = {};

    records.forEach((rec, index) => {
      for (const rule of rules) {
        const value = rec[rule.field];
        if (rule.required && (value === undefined || value === null || value === '')) {
          failures.push({ index, field: rule.field, reason: 'required' });
          continue;
        }
        if (rule.pattern && typeof value === 'string') {
          const regex = new RegExp(rule.pattern);
          if (!regex.test(value)) {
            failures.push({ index, field: rule.field, reason: 'pattern' });
          }
        }
        if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
          failures.push({ index, field: rule.field, reason: 'min' });
        }
        if (rule.max !== undefined && typeof value === 'number' && value > rule.max) {
          failures.push({ index, field: rule.field, reason: 'max' });
        }
        if (rule.unique) {
          const set = uniques[rule.field] || new Set();
          if (set.has(value)) {
            failures.push({ index, field: rule.field, reason: 'unique' });
          } else {
            set.add(value);
            uniques[rule.field] = set;
          }
        }
      }
    });

    const passRate = records.length ? (records.length - failures.length) / records.length : 1;
    const result = { passRate, failures };
    this.results[sourceId] = result;
    return result;
  }

  loadRules(filePath: string): DQRule[] {
    const content = fs.readFileSync(filePath, 'utf8');
    return filePath.endsWith('.yaml') || filePath.endsWith('.yml')
      ? ((yaml.load(content) as any).rules as DQRule[])
      : JSON.parse(content);
  }
}

export default new DataQualityService();
export type { DQRule, DQResult, DQFailure };
